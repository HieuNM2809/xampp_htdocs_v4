<?php

namespace App\Models;

/**
 * User model class
 */
class User
{
    private $id;
    private $name;
    private $email;
    private $status;
    
    public function __construct($id, $name, $email, $status = 'active')
    {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->status = $status;
    }
    
    public function getId()
    {
        return $this->id;
    }
    
    public function getName()
    {
        return $this->name;
    }
    
    public function getEmail()
    {
        return $this->email;
    }
    
    public function getStatus()
    {
        return $this->status;
    }
    
    public function setName($name)
    {
        $this->name = $name;
    }
    
    public function setEmail($email)
    {
        $this->email = $email;
    }
    
    public function setStatus($status)
    {
        $this->status = $status;
    }
    
    /**
     * Convert to array
     * @return array
     */
    public function toArray()
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status
        ];
    }
    
    /**
     * JSON serialization
     * @return array
     */
    public function jsonSerialize()
    {
        return $this->toArray();
    }
}
