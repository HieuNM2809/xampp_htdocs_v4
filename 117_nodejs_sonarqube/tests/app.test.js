const request = require('supertest');
const app = require('../src/app');

describe('API Tests', () => {
    test('GET / should return welcome message', async () => {
        const response = await request(app)
            .get('/')
            .expect(200);
            
        expect(response.body.message).toBe('Welcome to Node.js SonarQube Demo API');
    });
    
    test('GET /api/users should return users array', async () => {
        const response = await request(app)
            .get('/api/users')
            .expect(200);
            
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
    });
    
    test('GET /api/users/:id should return specific user', async () => {
        const response = await request(app)
            .get('/api/users/1')
            .expect(200);
            
        expect(response.body.id).toBe(1);
        expect(response.body.name).toBeDefined();
    });
    
    test('GET /api/users/:id should return 404 for non-existent user', async () => {
        await request(app)
            .get('/api/users/999')
            .expect(404);
    });
});
