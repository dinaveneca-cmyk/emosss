<?php
/**
 * Proxy CORS para M3U8 Streams
 * Maneja peticiones con headers apropiados para evitar errores 403/CORS
 * 
 * Uso: proxy.php?url=https://example.com/stream.m3u8
 * 
 * @author Assistant
 * @version 1.0
 */

// Configuración CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Manejo de solicitudes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class StreamProxy {
    
    private $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    private $referer = 'https://la14hd.com/';
    private $timeout = 30;
    
    /**
     * Proxy una URL con headers apropiados
     */
    public function proxyUrl($url) {
        try {
            // Validar URL
            if (!filter_var($url, FILTER_VALIDATE_URL)) {
                throw new Exception('URL inválida');
            }
            
            // Verificar que sea una URL de stream válida
            if (!$this->isValidStreamUrl($url)) {
                throw new Exception('URL de stream no válida');
            }
            
            // Usar cURL para mejor control de headers
            $ch = curl_init();
            
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT => $this->timeout,
                CURLOPT_USERAGENT => $this->userAgent,
                CURLOPT_REFERER => $this->referer,
                CURLOPT_HTTPHEADER => [
                    'Origin: https://la14hd.com',
                    'Accept: */*',
                    'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
                    'Accept-Encoding: gzip, deflate, br',
                    'Connection: keep-alive',
                    'Sec-Fetch-Dest: empty',
                    'Sec-Fetch-Mode: cors',
                    'Sec-Fetch-Site: cross-site'
                ],
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_ENCODING => '',
                CURLOPT_HEADERFUNCTION => [$this, 'handleResponseHeaders']
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            
            if (curl_error($ch)) {
                throw new Exception('Error cURL: ' . curl_error($ch));
            }
            
            curl_close($ch);
            
            if ($httpCode !== 200) {
                throw new Exception("HTTP $httpCode: Error al obtener el stream");
            }
            
            // Establecer headers de respuesta apropiados
            if (strpos($contentType, 'application/vnd.apple.mpegurl') !== false || 
                strpos($contentType, 'application/x-mpegURL') !== false ||
                strpos($url, '.m3u8') !== false) {
                header('Content-Type: application/vnd.apple.mpegurl');
            } else {
                header('Content-Type: ' . ($contentType ?: 'application/octet-stream'));
            }
            
            // Procesar contenido M3U8 si es necesario
            if (strpos($url, '.m3u8') !== false) {
                $response = $this->processM3U8Content($response, $url);
            }
            
            return $response;
            
        } catch (Exception $e) {
            http_response_code(500);
            return json_encode([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Manejar headers de respuesta
     */
    private function handleResponseHeaders($ch, $header) {
        $headerName = trim(explode(':', $header)[0]);
        
        // Reenviar ciertos headers importantes
        $allowedHeaders = [
            'Content-Length',
            'Content-Range',
            'Accept-Ranges',
            'Last-Modified',
            'ETag',
            'Cache-Control'
        ];
        
        if (in_array($headerName, $allowedHeaders) && strpos($header, ':') !== false) {
            header(trim($header));
        }
        
        return strlen($header);
    }
    
    /**
     * Procesar contenido M3U8 para URLs relativas
     */
    private function processM3U8Content($content, $baseUrl) {
        $lines = explode("\n", $content);
        $processedLines = [];
        $baseUrlParts = parse_url($baseUrl);
        $baseUrlPrefix = $baseUrlParts['scheme'] . '://' . $baseUrlParts['host'];
        
        if (isset($baseUrlParts['port'])) {
            $baseUrlPrefix .= ':' . $baseUrlParts['port'];
        }
        
        $basePath = dirname($baseUrlParts['path']);
        
        foreach ($lines as $line) {
            $line = trim($line);
            
            // Si la línea es una URL relativa, convertirla a absoluta
            if (!empty($line) && 
                !str_starts_with($line, '#') && 
                !str_starts_with($line, 'http://') && 
                !str_starts_with($line, 'https://')) {
                
                if (str_starts_with($line, '/')) {
                    // URL absoluta relativa al dominio
                    $line = $baseUrlPrefix . $line;
                } else {
                    // URL relativa al directorio actual
                    $line = $baseUrlPrefix . $basePath . '/' . $line;
                }
                
                // Proxy las URLs de segmentos también
                $line = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . 
                        $_SERVER['SCRIPT_NAME'] . '?url=' . urlencode($line);
            }
            
            $processedLines[] = $line;
        }
        
        return implode("\n", $processedLines);
    }
    
    /**
     * Validar si es una URL de stream válida
     */
    private function isValidStreamUrl($url) {
        $allowedDomains = [
            'fubohd.com',
            'tyg2mnl9.fubohd.com',
            'la14hd.com'
        ];
        
        $allowedExtensions = ['.m3u8', '.ts', '.m4s'];
        
        $parsedUrl = parse_url($url);
        $domain = $parsedUrl['host'] ?? '';
        
        // Verificar dominio
        foreach ($allowedDomains as $allowedDomain) {
            if (strpos($domain, $allowedDomain) !== false) {
                return true;
            }
        }
        
        // Verificar extensión
        foreach ($allowedExtensions as $ext) {
            if (strpos($url, $ext) !== false) {
                return true;
            }
        }
        
        return false;
    }
}

// Manejo de la petición
try {
    if (!isset($_GET['url'])) {
        throw new Exception('Parámetro URL requerido');
    }
    
    $url = $_GET['url'];
    $proxy = new StreamProxy();
    
    echo $proxy->proxyUrl($url);
    
} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

?>