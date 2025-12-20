<?php

namespace Tests;

use PHPUnit\Framework\TestCase;
use App\Models\User;

class UserTest extends TestCase
{
    public function testCreateUser()
    {
        $user = new User(1, 'John Doe', 'john@example.com', 'active');
        
        $this->assertEquals(1, $user->getId());
        $this->assertEquals('John Doe', $user->getName());
        $this->assertEquals('john@example.com', $user->getEmail());
        $this->assertEquals('active', $user->getStatus());
    }

    public function testUserDefaultStatus()
    {
        $user = new User(1, 'John Doe', 'john@example.com');
        
        $this->assertEquals('active', $user->getStatus());
    }

    public function testSetters()
    {
        $user = new User(1, 'John Doe', 'john@example.com');
        
        $user->setName('Jane Doe');
        $user->setEmail('jane@example.com');
        $user->setStatus('inactive');
        
        $this->assertEquals('Jane Doe', $user->getName());
        $this->assertEquals('jane@example.com', $user->getEmail());
        $this->assertEquals('inactive', $user->getStatus());
    }

    public function testToArray()
    {
        $user = new User(1, 'John Doe', 'john@example.com', 'active');
        $array = $user->toArray();
        
        $this->assertIsArray($array);
        $this->assertEquals([
            'id' => 1,
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'status' => 'active'
        ], $array);
    }

    public function testJsonSerialize()
    {
        $user = new User(1, 'John Doe', 'john@example.com', 'active');
        $json = $user->jsonSerialize();
        
        $this->assertIsArray($json);
        $this->assertEquals($user->toArray(), $json);
    }
}
