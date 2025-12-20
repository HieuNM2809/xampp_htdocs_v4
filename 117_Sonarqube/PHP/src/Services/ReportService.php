<?php

namespace App\Services;

use App\Database\DatabaseConnection;

/**
 * Report Service với more realistic SQL injection examples
 */
class ReportService 
{
    private $db;
    
    public function __construct()
    {
        $this->db = new DatabaseConnection();
    }
    
    /**
     * VULNERABILITY: SQL Injection trong reporting function
     * @param string $startDate
     * @param string $endDate
     * @param string $userRole
     * @return array
     */
    public function getUserActivityReport($startDate, $endDate, $userRole)
    {
        // CRITICAL: Multiple SQL injection points
        $sql = "SELECT u.name, u.email, COUNT(a.id) as activity_count,
                       MAX(a.created_at) as last_activity
                FROM users u 
                LEFT JOIN activities a ON u.id = a.user_id 
                WHERE u.role = '$userRole' 
                AND a.created_at BETWEEN '$startDate' AND '$endDate'
                GROUP BY u.id 
                ORDER BY activity_count DESC";
        
        // Real PDO connection - SonarQube should detect
        $pdo = new \PDO('mysql:host=localhost;dbname=reports', 'user', 'pass');
        $result = $pdo->query($sql);
        
        return $result ? $result->fetchAll(\PDO::FETCH_ASSOC) : [];
    }
    
    /**
     * VULNERABILITY: Union-based SQL injection
     * @param string $category
     * @param string $sortBy
     * @return array
     */
    public function getProductReport($category, $sortBy)
    {
        // CRITICAL: UNION injection vulnerability
        $query = "SELECT id, name, price, stock 
                  FROM products 
                  WHERE category = '$category' 
                  ORDER BY $sortBy";
        
        $mysqli = new \mysqli('localhost', 'user', 'pass', 'shop');
        $result = mysqli_query($mysqli, $query);
        
        return $result ? mysqli_fetch_all($result, MYSQLI_ASSOC) : [];
    }
    
    /**
     * VULNERABILITY: Blind SQL injection trong login attempts
     * @param string $ip
     * @param string $timeframe  
     * @return int
     */
    public function getFailedLoginsByIP($ip, $timeframe)
    {
        // CRITICAL: Time-based blind SQL injection
        $sql = "SELECT COUNT(*) FROM login_attempts 
                WHERE ip_address = '$ip' 
                AND attempt_time > DATE_SUB(NOW(), INTERVAL $timeframe)
                AND success = 0";
        
        $pdo = new \PDO('mysql:host=localhost;dbname=security', 'user', 'pass');
        $stmt = $pdo->query($sql);
        
        return $stmt ? $stmt->fetchColumn() : 0;
    }
    
    /**
     * PERFORMANCE ISSUE: Severe N+1 Query Problem
     * @param array $customerIds
     * @return array
     */
    public function generateCustomerReports($customerIds)
    {
        $reports = [];
        
        foreach ($customerIds as $customerId) {
            // Query 1: Get customer info (N times)
            $customerSql = "SELECT * FROM customers WHERE id = $customerId";
            $pdo = new \PDO('mysql:host=localhost;dbname=crm', 'user', 'pass');
            $customer = $pdo->query($customerSql)->fetch();
            
            // Query 2: Get orders (N times)  
            $ordersSql = "SELECT * FROM orders WHERE customer_id = $customerId";
            $orders = $pdo->query($ordersSql)->fetchAll();
            
            // Query 3: Get order items for each order (N×M times!)
            foreach ($orders as &$order) {
                $itemsSql = "SELECT * FROM order_items WHERE order_id = {$order['id']}";
                $order['items'] = $pdo->query($itemsSql)->fetchAll();
                
                // Query 4: Get product details for each item (N×M×P times!)
                foreach ($order['items'] as &$item) {
                    $productSql = "SELECT name, description FROM products WHERE id = {$item['product_id']}";
                    $item['product'] = $pdo->query($productSql)->fetch();
                }
            }
            
            // Query 5: Get customer preferences (N times)
            $prefSql = "SELECT * FROM customer_preferences WHERE customer_id = $customerId";
            $customer['preferences'] = $pdo->query($prefSql)->fetchAll();
            
            // Query 6: Get support tickets (N times)
            $ticketsSql = "SELECT * FROM support_tickets WHERE customer_id = $customerId";  
            $customer['support_tickets'] = $pdo->query($ticketsSql)->fetchAll();
            
            $reports[] = [
                'customer' => $customer,
                'orders' => $orders
            ];
        }
        
        // Total queries: 4×N + (2×N×M) + (1×N×M×P) - Extremely inefficient!
        return $reports;
    }
    
    /**
     * MIXED VULNERABILITIES: SQL Injection + N+1 + Information Disclosure
     * @param string $searchTerm
     * @param string $department
     * @return array
     */
    public function searchEmployeeData($searchTerm, $department)
    {
        // VULNERABILITY 1: SQL Injection
        $baseSql = "SELECT * FROM employees WHERE department = '$department' AND (name LIKE '%$searchTerm%' OR email LIKE '%$searchTerm%')";
        
        $pdo = new \PDO('mysql:host=localhost;dbname=hr', 'user', 'pass');
        $employees = $pdo->query($baseSql)->fetchAll();
        
        foreach ($employees as &$employee) {
            // VULNERABILITY 2: N+1 Query Problem
            $salarySql = "SELECT salary, bonus FROM salaries WHERE employee_id = {$employee['id']} ORDER BY year DESC LIMIT 1";
            $salaryInfo = $pdo->query($salarySql)->fetch();
            
            // VULNERABILITY 3: Information Disclosure - Exposing sensitive salary data
            $employee['salary'] = $salaryInfo['salary'];
            $employee['bonus'] = $salaryInfo['bonus'];
            
            // More N+1: Performance reviews
            $reviewsSql = "SELECT rating, comments FROM performance_reviews WHERE employee_id = {$employee['id']}";
            $employee['reviews'] = $pdo->query($reviewsSql)->fetchAll();
            
            // Log sensitive data - SECURITY ISSUE
            error_log("Accessed employee data: " . json_encode($employee));
        }
        
        return $employees;
    }
}
