<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

function extractM3U8FromUrl($url) {
  try {
      // Configurar cURL
      $ch = curl_init();
      curl_setopt($ch, CURLOPT_URL, $url);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
      curl_setopt($ch, CURLOPT_TIMEOUT, 30);
      curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
      curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
      
      $content = curl_exec($ch);
      $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);
      
      if ($httpCode !== 200 || !$content) {
          return null;
      }
      
      // Buscar enlaces M3U8 en el contenido
      $patterns = [
          '/https?:\/\/[^\s"\'<>]+\.m3u8[^\s"\'<>]*/i',
          '/["\']([^"\']*\.m3u8[^"\']*)["\']/',
          '/src\s*=\s*["\']([^"\']*\.m3u8[^"\']*)["\']/',
          '/source\s*:\s*["\']([^"\']*\.m3u8[^"\']*)["\']/',
          '/file\s*:\s*["\']([^"\']*\.m3u8[^"\']*)["\']/',
      ];
      
      foreach ($patterns as $pattern) {
          if (preg_match_all($pattern, $content, $matches)) {
              foreach ($matches[1] ?? $matches[0] as $match) {
                  if (filter_var($match, FILTER_VALIDATE_URL) && strpos($match, '.m3u8') !== false) {
                      return $match;
                  }
              }
          }
      }
      
      return null;
      
  } catch (Exception $e) {
      error_log("Error extracting M3U8: " . $e->getMessage());
      return null;
  }
}

// Función para convertir URL relativa a absoluta
function makeAbsoluteUrl($relativeUrl, $baseUrl = 'https://golazoplay.com') {
  if (filter_var($relativeUrl, FILTER_VALIDATE_URL)) {
      return $relativeUrl;
  }
  
  if (strpos($relativeUrl, '/') === 0) {
      return rtrim($baseUrl, '/') . $relativeUrl;
  }
  
  return $baseUrl . '/' . ltrim($relativeUrl, '/');
}

// Función original para streams (mantener intacta)
function getStreamUrl($stream) {
  $baseUrl = "https://la14hd.com/vivo/canal.php?stream=";
  return extractM3U8FromUrl($baseUrl . $stream);
}

// NUEVA FUNCIÓN: Extraer stream del parámetro 'r'
function extractStreamFromR($rParam) {
  try {
      $decodedUrl = base64_decode($rParam);
      error_log("Decoded URL from 'r': " . $decodedUrl);
      
      // Verificar si es una URL de la14hd.com con parámetro stream
      if (strpos($decodedUrl, 'la14hd.com/vivo/canal') !== false && strpos($decodedUrl, 'stream=') !== false) {
          $urlParts = parse_url($decodedUrl);
          if (isset($urlParts['query'])) {
              parse_str($urlParts['query'], $queryParams);
              if (isset($queryParams['stream'])) {
                  $stream = $queryParams['stream'];
                  error_log("Extracted stream: " . $stream);
                  return $stream;
              }
          }
      }
      
      return null;
  } catch (Exception $e) {
      error_log("Error extracting stream from 'r': " . $e->getMessage());
      return null;
  }
}

// Manejo de parámetros
$response = ['success' => false, 'url' => null, 'error' => null, 'debug' => []];

try {
  // Nuevo: Manejar URLs de iframe
  if (isset($_GET['iframe'])) {
      $iframeUrl = $_GET['iframe'];
      
      // Convertir URL relativa a absoluta si es necesario
      $absoluteUrl = makeAbsoluteUrl($iframeUrl);
      
      error_log("=== IFRAME EXTRACTION ===");
      error_log("URL original: " . $iframeUrl);
      error_log("URL absoluta: " . $absoluteUrl);
      
      $response['debug']['original_url'] = $iframeUrl;
      $response['debug']['absolute_url'] = $absoluteUrl;
      
      // ESTRATEGIA HÍBRIDA: Verificar si tiene parámetro 'r' primero
      $urlParts = parse_url($iframeUrl);
      if (isset($urlParts['query'])) {
          parse_str($urlParts['query'], $queryParams);
          if (isset($queryParams['r'])) {
              error_log("Found 'r' parameter, trying to extract stream...");
              
              $stream = extractStreamFromR($queryParams['r']);
              if ($stream) {
                  error_log("Using stream method for: " . $stream);
                  
                  $m3u8Url = getStreamUrl($stream);
                  if ($m3u8Url) {
                      $response['success'] = true;
                      $response['url'] = $m3u8Url;
                      $response['source'] = 'iframe_to_stream';
                      $response['debug']['extracted_stream'] = $stream;
                      $response['debug']['method'] = 'r_parameter_decoded_to_stream';
                      
                      echo json_encode($response);
                      exit;
                  } else {
                      error_log("Stream method failed, trying iframe content extraction...");
                  }
              }
          }
      }
      
      // Si no funciona el método de stream, intentar extracción de contenido
      if (filter_var($absoluteUrl, FILTER_VALIDATE_URL)) {
          $m3u8Url = extractM3U8FromUrl($absoluteUrl);
          
          if ($m3u8Url) {
              $response['success'] = true;
              $response['url'] = $m3u8Url;
              $response['source'] = 'iframe_content';
              $response['debug']['method'] = 'iframe_content_parsing';
          } else {
              $response['error'] = 'No se encontró M3U8 en la URL del iframe';
              $response['debug']['tried_url'] = $absoluteUrl;
              $response['debug']['method'] = 'failed_both_methods';
          }
      } else {
          $response['error'] = 'URL del iframe no válida después de conversión';
          $response['debug']['validation_failed'] = true;
      }
  }
  // Original: Manejar streams directos
  elseif (isset($_GET['stream'])) {
      $stream = $_GET['stream'];
      
      error_log("=== DIRECT STREAM EXTRACTION ===");
      error_log("Stream: " . $stream);
      
      $m3u8Url = getStreamUrl($stream);
      
      if ($m3u8Url) {
          $response['success'] = true;
          $response['url'] = $m3u8Url;
          $response['source'] = 'direct_stream';
          $response['debug']['stream'] = $stream;
          $response['debug']['method'] = 'direct_stream';
      } else {
          $response['error'] = 'No se pudo obtener la URL del stream';
          $response['debug']['stream'] = $stream;
          $response['debug']['method'] = 'failed';
      }
  } else {
      $response['error'] = 'Parámetro requerido: stream o iframe';
  }
  
} catch (Exception $e) {
  $response['error'] = 'Error del servidor: ' . $e->getMessage();
  $response['debug']['exception'] = $e->getMessage();
}

echo json_encode($response);
?>