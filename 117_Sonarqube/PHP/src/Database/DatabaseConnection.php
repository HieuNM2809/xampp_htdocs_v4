<?php

namespace App\Database;

use PDO;
use mysqli;

/**
 * Database connection class với nhiều SQL injection vulnerabilities
 * và N+1 Query Problems để SonarQube phát hiện
 */
class DatabaseConnection
{
    private $pdo;
    private $mysqli;
    
    public function __construct()
    {
        // Real database connections - không phải memory
        $this->pdo = new PDO('mysql:host=localhost;dbname=testdb', 'user', 'password');
        $this->mysqli = new mysqli('localhost', 'user', 'password', 'testdb');
    }
    
    /**
     * VULNERABILITY: Classic SQL Injection với real MySQL connection
     * @param string $username
     * @param string $password
     * @return array|false
     */
    public function authenticateUser($username, $password)
    {
        // CRITICAL: SQL Injection - Real world example
        $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
        
        // SonarQube PHẢI phát hiện với real database
        $result = $this->pdo->query($sql);
        
        return $result ? $result->fetch(PDO::FETCH_ASSOC) : false;
    }
    
    /**
     * VULNERABILITY: SQL Injection với MySQLi
     * @param int $userId
     * @return array|null
     */
    public function getUserProfile($userId)
    {
        // CRITICAL: Direct variable interpolation
        $query = "SELECT u.*, p.address, p.phone 
                  FROM users u 
                  LEFT JOIN profiles p ON u.id = p.user_id 
                  WHERE u.id = $userId";
        
        // SonarQube should detect this
        $result = mysqli_query($this->mysqli, $query);
        
        return $result ? mysqli_fetch_assoc($result) : null;
    }
    
    /**
     * VULNERABILITY: Dynamic table name injection
     * @param string $table
     * @param string $condition
     * @param string $orderBy
     * @return array
     */
    public function getDataFromTable($table, $condition, $orderBy)
    {
        // CRITICAL: Multiple injection points
        $sql = "SELECT * FROM $table WHERE $condition ORDER BY $orderBy";
        
        // Triple injection vulnerability
        $stmt = $this->pdo->query($sql);
        
        return $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    }
    
    /**
     * VULNERABILITY: SQL Injection trong WHERE IN clause
     * @param string $userIds
     * @return array
     */
    public function getUsersByIds($userIds)
    {
        // CRITICAL: IN clause injection
        $sql = "SELECT * FROM users WHERE id IN ($userIds)";
        
        $result = $this->pdo->query($sql);
        return $result ? $result->fetchAll() : [];
    }
    
    /**
     * PERFORMANCE ISSUE: N+1 Query Problem - Classic Example
     * @param array $postIds
     * @return array
     */
    public function getPostsWithComments($postIds)
    {
        $posts = [];
        
        // N+1 Problem: 1 query để lấy posts + N queries để lấy comments
        foreach ($postIds as $postId) {
            // Query 1: Get post (trong loop = N queries)
            $postSql = "SELECT * FROM posts WHERE id = ?";
            $postStmt = $this->pdo->prepare($postSql);
            $postStmt->execute([$postId]);
            $post = $postStmt->fetch();
            
            if ($post) {
                // Query 2: Get comments for each post (thêm N queries nữa)
                $commentSql = "SELECT * FROM comments WHERE post_id = ?";
                $commentStmt = $this->pdo->prepare($commentSql);
                $commentStmt->execute([$postId]);
                $post['comments'] = $commentStmt->fetchAll();
                
                // Query 3: Get author for each post (thêm N queries nữa)
                $authorSql = "SELECT name, email FROM users WHERE id = ?";
                $authorStmt = $this->pdo->prepare($authorSql);
                $authorStmt->execute([$post['author_id']]);
                $post['author'] = $authorStmt->fetch();
                
                $posts[] = $post;
            }
        }
        
        // Total queries: 1 + (3 × N) queries thay vì chỉ 2-3 queries
        return $posts;
    }
    
    /**
     * PERFORMANCE ISSUE: N+1 trong User-Profile relationship
     * @return array
     */
    public function getAllUsersWithProfiles()
    {
        // Query 1: Get all users
        $users = $this->pdo->query("SELECT * FROM users")->fetchAll();
        
        // N+1 Problem: Loop qua mỗi user để lấy profile
        foreach ($users as &$user) {
            // N queries: Mỗi user = 1 query riêng
            $profileStmt = $this->pdo->prepare("SELECT * FROM profiles WHERE user_id = ?");
            $profileStmt->execute([$user['id']]);
            $user['profile'] = $profileStmt->fetch();
            
            // Thêm N queries nữa cho addresses
            $addressStmt = $this->pdo->prepare("SELECT * FROM addresses WHERE user_id = ?");
            $addressStmt->execute([$user['id']]);
            $user['addresses'] = $addressStmt->fetchAll();
        }
        
        // Total: 1 + (2 × N) queries instead của 2-3 queries với JOINs
        return $users;
    }
    
    /**
     * BAD PRACTICE: Mixed SQL injection + N+1 problem
     * @param string $searchTerm
     * @return array
     */
    public function searchUsersWithDetails($searchTerm)
    {
        // VULNERABILITY: SQL Injection
        $userSql = "SELECT * FROM users WHERE name LIKE '%$searchTerm%'";
        $users = $this->pdo->query($userSql)->fetchAll();
        
        // N+1 PROBLEM: Loop để lấy details cho mỗi user
        foreach ($users as &$user) {
            // N queries cho orders
            $orderSql = "SELECT COUNT(*) as order_count FROM orders WHERE user_id = {$user['id']}";
            $orderResult = $this->pdo->query($orderSql);
            $user['order_count'] = $orderResult->fetchColumn();
            
            // N queries cho last login (with injection risk)
            $loginSql = "SELECT MAX(login_time) FROM user_sessions WHERE user_id = {$user['id']}";
            $loginResult = $this->pdo->query($loginSql);
            $user['last_login'] = $loginResult->fetchColumn();
        }
        
        return $users;
    }
    
    /**
     * SOLUTION: Optimized version - Proper JOINs để avoid N+1
     * @param array $postIds
     * @return array
     */
    public function getPostsWithCommentsOptimized($postIds)
    {
        if (empty($postIds)) return [];
        
        // Chỉ 1 query với JOINs thay vì N+1 queries
        $placeholders = str_repeat('?,', count($postIds) - 1) . '?';
        $sql = "SELECT 
                    p.id as post_id, p.title, p.content, p.author_id,
                    c.id as comment_id, c.content as comment_content, c.author_id as comment_author,
                    u.name as author_name, u.email as author_email
                FROM posts p 
                LEFT JOIN comments c ON p.id = c.post_id 
                LEFT JOIN users u ON p.author_id = u.id
                WHERE p.id IN ($placeholders)
                ORDER BY p.id, c.id";
                
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($postIds);
        
        // Group results properly
        $posts = [];
        while ($row = $stmt->fetch()) {
            $postId = $row['post_id'];
            if (!isset($posts[$postId])) {
                $posts[$postId] = [
                    'id' => $row['post_id'],
                    'title' => $row['title'], 
                    'content' => $row['content'],
                    'author' => [
                        'name' => $row['author_name'],
                        'email' => $row['author_email']
                    ],
                    'comments' => []
                ];
            }
            
            if ($row['comment_id']) {
                $posts[$postId]['comments'][] = [
                    'id' => $row['comment_id'],
                    'content' => $row['comment_content'],
                    'author_id' => $row['comment_author']
                ];
            }
        }
        
        return array_values($posts);
    }
}
