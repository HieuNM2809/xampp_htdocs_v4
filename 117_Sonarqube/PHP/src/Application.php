<?php

namespace App;

use App\Models\User;
use App\Utils\UserUtils;
use Exception;

/**
 * Main Application class with intentional code smells for SonarQube demo
 */
class Application
{
    private $users = [];
    private $config = [];

    public function __construct()
    {
        // Sample data
        $this->users = [
            new User(1, 'John Doe', 'john@example.com', 'active'),
            new User(2, 'Jane Smith', 'jane@example.com', 'active'),
            new User(3, 'Bob Wilson', 'bob@example.com', 'inactive')
        ];
        
        // Code smell: unused variable
        $unusedVariable = 'This variable is never used';
    }

    /**
     * Get all users
     * @return array
     */
    public function getAllUsers()
    {
        return $this->users;
    }

    /**
     * Get user by ID - có một số code smell cố ý để demo
     * @param int $id
     * @return User|null
     */
    public function getUserById($id)
    {
        // Code smell: unused variable
        $debugInfo = 'Finding user with ID: ' . $id;
        
        // Code smell: inefficient loop
        $foundUser = null;
        for ($i = 0; $i < count($this->users); $i++) {
            if ($this->users[$i]->getId() == $id) { // Code smell: == instead of ===
                $foundUser = $this->users[$i];
                break;
            }
        }
        
        return $foundUser;
    }

    /**
     * Create new user
     * @param string $name
     * @param string $email
     * @param string $status
     * @return User
     */
    public function createUser($name, $email, $status = 'active')
    {
        // Code smell: no input validation
        $newUser = new User(
            count($this->users) + 1,
            $name,
            $email,
            $status
        );
        
        $this->users[] = $newUser;
        return $newUser;
    }

    /**
     * Duplicate email validation - code smell
     * @param string $email
     * @return bool
     */
    public function validateEmail($email)
    {
        $emailRegex = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';
        return preg_match($emailRegex, $email);
    }

    /**
     * Another duplicate email validation - code smell
     * @param string $email
     * @return bool
     */
    public function checkEmailFormat($email)
    {
        $emailRegex = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';
        return preg_match($emailRegex, $email);
    }

    /**
     * Function with high complexity - code smell
     * @param array $data
     * @return string
     */
    public function complexFunction($data)
    {
        if ($data) {
            if (isset($data['type']) && $data['type'] === 'user') {
                if (isset($data['status']) && $data['status'] === 'active') {
                    if (isset($data['permissions'])) {
                        if (isset($data['permissions']['read']) && $data['permissions']['read']) {
                            if (isset($data['permissions']['write']) && $data['permissions']['write']) {
                                if (isset($data['permissions']['admin']) && $data['permissions']['admin']) {
                                    return 'full-access';
                                } else {
                                    return 'read-write';
                                }
                            } else {
                                return 'read-only';
                            }
                        } else {
                            return 'no-access';
                        }
                    } else {
                        return 'no-permissions';
                    }
                } else {
                    return 'inactive';
                }
            } else {
                return 'not-user';
            }
        } else {
            return 'no-data';
        }
    }

    /**
     * Security hotspot: potential SQL injection risk (simulation)
     * @param string $query
     * @return array
     */
    public function searchUsers($query)
    {
        // VULNERABILITY: SQL injection - SonarQube sẽ phát hiện
        $sql = "SELECT * FROM users WHERE name LIKE '%$query%'";
        
        // Simulate database execution - SonarQube cần thấy database call
        // Uncomment dòng dưới để SonarQube phát hiện SQL injection:
        // $result = mysqli_query($connection, $sql);
        // $result = $pdo->query($sql);
        
        error_log('Executing query: ' . $sql);
        
        // Manual search for demo purposes
        $results = [];
        foreach ($this->users as $user) {
            if (strpos(strtolower($user->getName()), strtolower($query)) !== false) {
                $results[] = $user;
            }
        }
        
        return $results;
    }

    /**
     * VULNERABLE: Real SQL injection example - SonarQube sẽ phát hiện
     * @param string $query
     * @return array
     */
    public function searchUsersVulnerable($query)
    {
        // Giả lập có database connection
        $pdo = new PDO('sqlite::memory:');
        
        // CRITICAL: SQL Injection vulnerability - SonarQube SẼ phát hiện
        $sql = "SELECT * FROM users WHERE name LIKE '%$query%'";
        $result = $pdo->query($sql); // <-- SonarQube phát hiện tại đây
        
        return $result ? $result->fetchAll() : [];
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
    public function createDetailedUser($id, $firstName, $lastName, $email, $phone, $address, $city, $country, $zipCode)
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
     * Process user data with high cognitive complexity - code smell
     * @param array $users
     * @param array $filters
     * @param array $options
     * @return array
     */
    public function processUserData($users, $filters = null, $options = null)
    {
        $result = [];
        
        foreach ($users as $user) {
            if ($filters) {
                if (isset($filters['status'])) {
                    if ($user->getStatus() === $filters['status']) {
                        if (isset($filters['role'])) {
                            if (isset($user->role) && $user->role === $filters['role']) {
                                if ($options) {
                                    if (isset($options['includeInactive']) && $options['includeInactive']) {
                                        $result[] = $user;
                                    } else {
                                        if ($user->getStatus() === 'active') {
                                            $result[] = $user;
                                        }
                                    }
                                } else {
                                    $result[] = $user;
                                }
                            }
                        } else {
                            $result[] = $user;
                        }
                    }
                } else {
                    $result[] = $user;
                }
            } else {
                $result[] = $user;
            }
        }
        
        return $result;
    }

    /**
     * Get API response
     * @param string $endpoint
     * @return array
     */
    public function getApiResponse($endpoint)
    {
        switch ($endpoint) {
            case '/':
                return ['message' => 'Welcome to PHP SonarQube Demo API'];
            case '/api/users':
                return $this->getAllUsers();
            default:
                return ['error' => 'Endpoint not found'];
        }
    }
}

// Dead code - function that is never used
function unusedFunction()
{
    $data = 'this function is never called';
    return $data;
}
