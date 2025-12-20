<?php

namespace App\Utils;

/**
 * User utility functions với một số code issues để demo
 */
class UserUtils
{
    /**
     * Format user data - code smell: unused parameter
     * @param array $user
     * @param array $options
     * @return array
     */
    public static function formatUserData($user, $options = null)
    {
        return [
            'id' => $user['id'],
            'name' => strtoupper($user['name']),
            'email' => strtolower($user['email'])
        ];
    }
    
    /**
     * Duplicate email validation - code smell
     * @param string $email
     * @return bool
     */
    public static function isValidEmail($email)
    {
        $regex = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';
        return preg_match($regex, $email);
    }
    
    /**
     * Another duplicate email validation - code smell
     * @param string $email
     * @return bool
     */
    public static function checkEmail($email)
    {
        $regex = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';
        return preg_match($regex, $email);
    }
    
    /**
     * Function with too many parameters - code smell
     * @param int $id
     * @param string $firstName
     * @param string $lastName
     * @param string $email
     * @param string $phone
     * @param string $address
     * @param string $city
     * @param string $country
     * @param string $zipCode
     * @return array
     */
    public static function createUser($id, $firstName, $lastName, $email, $phone, $address, $city, $country, $zipCode)
    {
        return [
            'id' => $id,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => $email,
            'phone' => $phone,
            'address' => $address,
            'city' => $city,
            'country' => $country,
            'zipCode' => $zipCode
        ];
    }
    
    /**
     * Security hotspot: potential command injection (simulation)
     * @param string $filename
     * @return string
     */
    public static function readFile($filename)
    {
        // Code smell: potential command injection
        $command = "cat $filename";
        $output = shell_exec($command);
        return $output ?: '';
    }
    
    /**
     * Another security issue: file inclusion vulnerability (simulation)
     * @param string $file
     * @return mixed
     */
    public static function includeFile($file)
    {
        // Security hotspot: file inclusion vulnerability
        return include $file;
    }
    
    /**
     * Generate password hash - but with weak algorithm (code smell)
     * @param string $password
     * @return string
     */
    public static function hashPassword($password)
    {
        // Code smell: weak hashing algorithm
        return md5($password . 'salt');
    }
    
    /**
     * Debug function that outputs sensitive information - security issue
     * @param array $data
     * @return void
     */
    public static function debugDump($data)
    {
        // Security hotspot: potential information disclosure
        error_log('Debug data: ' . print_r($data, true));
        echo '<pre>' . print_r($data, true) . '</pre>';
    }
}

/**
 * Another utility class with similar issues
 */
class DatabaseUtils
{
    /**
     * Execute raw SQL - security vulnerability simulation
     * @param string $sql
     * @return array
     */
    public static function executeQuery($sql)
    {
        // Security hotspot: SQL injection vulnerability
        error_log("Executing SQL: $sql");
        
        // Simulation - in real scenario this would execute actual SQL
        return [];
    }
    
    /**
     * Build query with string concatenation - vulnerable pattern
     * @param string $table
     * @param string $where
     * @return string
     */
    public static function buildQuery($table, $where)
    {
        // Code smell: SQL injection risk
        return "SELECT * FROM $table WHERE $where";
    }
    
    /**
     * Get user by ID with SQL injection vulnerability
     * @param int $userId
     * @return array
     */
    public static function getUserById($userId)
    {
        // Security vulnerability: direct parameter injection
        $sql = "SELECT * FROM users WHERE id = $userId";
        return self::executeQuery($sql);
    }
}

// Dead code - class that is never instantiated
class UnusedUtility
{
    public function doSomething()
    {
        return 'This method is never called';
    }
    
    private function anotherUnusedMethod()
    {
        $data = 'unused data';
        return $data;
    }
}
