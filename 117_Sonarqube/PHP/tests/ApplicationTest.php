<?php

namespace Tests;

use PHPUnit\Framework\TestCase;
use App\Application;
use App\Models\User;

class ApplicationTest extends TestCase
{
    private $app;

    protected function setUp(): void
    {
        $this->app = new Application();
    }

    public function testGetAllUsers()
    {
        $users = $this->app->getAllUsers();
        
        $this->assertIsArray($users);
        $this->assertGreaterThan(0, count($users));
        $this->assertInstanceOf(User::class, $users[0]);
    }

    public function testGetUserById()
    {
        $user = $this->app->getUserById(1);
        
        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals(1, $user->getId());
        $this->assertEquals('John Doe', $user->getName());
    }

    public function testGetUserByIdNotFound()
    {
        $user = $this->app->getUserById(999);
        
        $this->assertNull($user);
    }

    public function testCreateUser()
    {
        $user = $this->app->createUser('Test User', 'test@example.com');
        
        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('Test User', $user->getName());
        $this->assertEquals('test@example.com', $user->getEmail());
        $this->assertEquals('active', $user->getStatus());
    }

    public function testValidateEmail()
    {
        $this->assertTrue($this->app->validateEmail('valid@example.com'));
        $this->assertFalse($this->app->validateEmail('invalid-email'));
        $this->assertFalse($this->app->validateEmail(''));
    }

    public function testCheckEmailFormat()
    {
        $this->assertTrue($this->app->checkEmailFormat('valid@example.com'));
        $this->assertFalse($this->app->checkEmailFormat('invalid-email'));
    }

    public function testComplexFunction()
    {
        $data = [
            'type' => 'user',
            'status' => 'active',
            'permissions' => [
                'read' => true,
                'write' => true,
                'admin' => true
            ]
        ];
        
        $result = $this->app->complexFunction($data);
        $this->assertEquals('full-access', $result);
        
        // Test other scenarios
        $this->assertEquals('no-data', $this->app->complexFunction(null));
        $this->assertEquals('not-user', $this->app->complexFunction(['type' => 'admin']));
    }

    public function testSearchUsers()
    {
        $results = $this->app->searchUsers('John');
        
        $this->assertIsArray($results);
        $this->assertGreaterThan(0, count($results));
        $this->assertInstanceOf(User::class, $results[0]);
    }

    public function testGetApiResponse()
    {
        // Test root endpoint
        $response = $this->app->getApiResponse('/');
        $this->assertArrayHasKey('message', $response);
        $this->assertEquals('Welcome to PHP SonarQube Demo API', $response['message']);
        
        // Test users endpoint
        $response = $this->app->getApiResponse('/api/users');
        $this->assertIsArray($response);
        $this->assertGreaterThan(0, count($response));
        
        // Test unknown endpoint
        $response = $this->app->getApiResponse('/unknown');
        $this->assertArrayHasKey('error', $response);
    }
}
