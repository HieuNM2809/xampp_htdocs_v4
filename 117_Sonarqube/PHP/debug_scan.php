<?php
/**
 * EXPLICIT VULNERABLE PATTERNS cho SonarQube testing
 * File này chứa các pattern mà SonarQube PHẢI phát hiện
 */

// =====================================
// 🚨 SQL INJECTION VULNERABILITIES  
// =====================================

function loginUser($username, $password) {
    // CRITICAL: Classic SQL injection
    $pdo = new PDO('mysql:host=localhost;dbname=app', 'user', 'pass');
    $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
    $result = $pdo->query($sql);  // <-- SonarQube MUST detect here
    return $result->fetch();
}

function searchProducts($term, $category) {
    // CRITICAL: Multiple injection points
    $mysqli = new mysqli('localhost', 'user', 'pass', 'shop');
    $query = "SELECT * FROM products WHERE name LIKE '%$term%' AND category = '$category'";
    $result = mysqli_query($mysqli, $query);  // <-- SonarQube MUST detect here
    return mysqli_fetch_all($result);
}

function getOrderDetails($orderId, $status) {
    // CRITICAL: Numeric + string injection
    $pdo = new PDO('mysql:host=localhost;dbname=orders', 'user', 'pass');
    $sql = "SELECT * FROM orders WHERE id = $orderId AND status = '$status'";
    $stmt = $pdo->query($sql);  // <-- SonarQube MUST detect here
    return $stmt->fetchAll();
}

function dynamicTableQuery($table, $where, $limit) {
    // CRITICAL: Triple injection - table, where, limit
    $pdo = new PDO('mysql:host=localhost;dbname=dynamic', 'user', 'pass'); 
    $sql = "SELECT * FROM $table WHERE $where LIMIT $limit";
    $result = $pdo->query($sql);  // <-- SonarQube MUST detect here
    return $result->fetchAll();
}

// =====================================
// ⚡ N+1 QUERY PROBLEMS
// =====================================

function getUsersWithPosts_N1Problem($userIds) {
    $pdo = new PDO('mysql:host=localhost;dbname=blog', 'user', 'pass');
    $users = [];
    
    // N+1 Problem: 1 + N queries instead của 1-2 queries
    foreach ($userIds as $userId) {
        // Query trong loop = N queries  
        $userStmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();
        
        // Another query trong loop = thêm N queries
        $postsStmt = $pdo->prepare("SELECT * FROM posts WHERE user_id = ?");
        $postsStmt->execute([$userId]);
        $user['posts'] = $postsStmt->fetchAll();
        
        // Third query trong loop = thêm N queries nữa
        $commentsStmt = $pdo->prepare("SELECT COUNT(*) FROM comments WHERE user_id = ?");  
        $commentsStmt->execute([$userId]);
        $user['comment_count'] = $commentsStmt->fetchColumn();
        
        $users[] = $user;
    }
    
    // Total: 3N queries instead của 2-3 queries với JOINs
    return $users;
}

function getProductsWithReviews_N1Problem($productIds) {
    $mysqli = new mysqli('localhost', 'user', 'pass', 'ecommerce');
    $products = [];
    
    foreach ($productIds as $productId) {
        // Query 1 for each product
        $productQuery = "SELECT * FROM products WHERE id = $productId";
        $productResult = mysqli_query($mysqli, $productQuery);
        $product = mysqli_fetch_assoc($productResult);
        
        // Query 2 for each product's reviews
        $reviewsQuery = "SELECT * FROM reviews WHERE product_id = $productId";
        $reviewsResult = mysqli_query($mysqli, $reviewsQuery);
        $product['reviews'] = mysqli_fetch_all($reviewsResult, MYSQLI_ASSOC);
        
        // Query 3 for each product's average rating
        $ratingQuery = "SELECT AVG(rating) FROM reviews WHERE product_id = $productId";
        $ratingResult = mysqli_query($mysqli, $ratingQuery);
        $product['avg_rating'] = mysqli_fetch_row($ratingResult)[0];
        
        $products[] = $product;
    }
    
    return $products;
}

// =====================================
// 🔐 OTHER SECURITY VULNERABILITIES
// =====================================

function executeSystemCommand($filename) {
    // CRITICAL: Command injection
    $command = "cat $filename";
    $output = shell_exec($command);  // <-- SonarQube should detect
    return $output;
}

function includeUserFile($userFile) {
    // CRITICAL: File inclusion vulnerability  
    return include $userFile;  // <-- SonarQube should detect
}

function weakPasswordHash($password) {
    // MEDIUM: Weak cryptography
    return md5($password . 'salt');  // <-- SonarQube should detect weak algorithm
}

function logSensitiveData($userData) {
    // LOW: Information disclosure
    error_log('User data: ' . print_r($userData, true));
    echo '<pre>' . print_r($userData, true) . '</pre>';  // <-- Debug info disclosure
}

// =====================================
// 🔥 MIXED VULNERABILITIES  
// =====================================

function criticalSecurityHole($searchTerm, $userRole, $limit) {
    // Multiple vulnerabilities trong 1 function
    
    // SQL Injection + Information Disclosure
    $pdo = new PDO('mysql:host=localhost;dbname=admin', 'root', 'admin123');
    $sql = "SELECT u.*, p.salary, p.ssn FROM users u JOIN private_data p ON u.id = p.user_id WHERE u.role = '$userRole' AND u.name LIKE '%$searchTerm%' LIMIT $limit";
    
    $result = $pdo->query($sql);  // <-- Multiple issues here
    $users = $result->fetchAll();
    
    // Command Injection  
    $logFile = "/var/log/search_" . $searchTerm . ".log";
    shell_exec("echo 'Search performed' >> $logFile");  // <-- Command injection
    
    // N+1 Problem
    foreach ($users as &$user) {
        $detailsStmt = $pdo->prepare("SELECT * FROM user_details WHERE user_id = ?");
        $detailsStmt->execute([$user['id']]);
        $user['details'] = $detailsStmt->fetch();
    }
    
    // Information Disclosure
    error_log("Admin search results: " . json_encode($users));
    
    return $users;
}

// =====================================
// 📊 EXPECTED SONARQUBE RESULTS
// =====================================

/*
Security Hotspots Expected: 15-20 issues

🔴 CRITICAL (SQL Injection): 7-8 issues
├── loginUser() - Line ~10
├── searchProducts() - Line ~17  
├── getOrderDetails() - Line ~24
├── dynamicTableQuery() - Line ~31
├── getUsersWithPosts_N1Problem() - Multiple lines
├── getProductsWithReviews_N1Problem() - Multiple lines  
└── criticalSecurityHole() - Line ~118

🟠 HIGH (Command/File Injection): 3-4 issues
├── executeSystemCommand() - Line ~89
├── includeUserFile() - Line ~95
└── criticalSecurityHole() - Line ~125

🟡 MEDIUM (Weak Crypto): 1-2 issues  
├── weakPasswordHash() - Line ~100

🟢 LOW (Info Disclosure): 2-3 issues
├── logSensitiveData() - Line ~105
└── criticalSecurityHole() - Line ~135

🔧 CODE SMELLS (Performance): 5-10 issues
├── N+1 Problems in loops
├── Inefficient database queries
└── Complex functions

Rules that should trigger:
- S2077: SQL injection
- S2076: Command injection  
- S2089: File inclusion
- S4792: Logging security
- S5542: Weak cryptography
*/
?>
