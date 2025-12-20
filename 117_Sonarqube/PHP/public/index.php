<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Application;

// Simple router simulation
$app = new Application();

// Get request URI and method
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Set JSON content type
header('Content-Type: application/json');

try {
    // Route handling
    if ($method === 'GET') {
        if ($uri === '/' || $uri === '/index.php') {
            echo json_encode($app->getApiResponse('/'));
        } elseif ($uri === '/api/users') {
            $users = $app->getAllUsers();
            $userArray = array_map(function($user) {
                return $user->toArray();
            }, $users);
            echo json_encode($userArray);
        } elseif (preg_match('/^\/api\/users\/(\d+)$/', $uri, $matches)) {
            $userId = (int)$matches[1];
            $user = $app->getUserById($userId);
            if ($user) {
                echo json_encode($user->toArray());
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
            }
        } elseif ($uri === '/api/search' && isset($_GET['q'])) {
            // VULNERABLE ENDPOINT: SQL injection risk
            $searchTerm = $_GET['q'];
            
            // CRITICAL: Direct SQL injection vulnerability
            $pdo = new PDO('sqlite::memory:');  
            $sql = "SELECT * FROM users WHERE name LIKE '%$searchTerm%' OR email LIKE '%$searchTerm%'";
            
            // SonarQube SẼ phát hiện SQL injection tại đây
            $stmt = $pdo->query($sql);
            $results = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
            
            echo json_encode($results);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
    } elseif ($method === 'POST' && $uri === '/api/users') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['name']) && isset($input['email'])) {
            $user = $app->createUser($input['name'], $input['email']);
            http_response_code(201);
            echo json_encode($user->toArray());
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Name and email are required']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
