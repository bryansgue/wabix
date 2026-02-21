import { authService } from './src/services/auth.service.js';

async function test() {
    console.log('Starting Auth Test...');
    try {
        console.log("Registering user 'testadmin'...");
        const user = await authService.register('testadmin', 'password123', 'admin');
        console.log('Registration successful:', user);

        console.log('Logging in...');
        const login = await authService.login('testadmin', 'password123');
        console.log('Login successful. Token:', login.token);
    } catch (error) {
        console.error('TEST FAILED:', error);
    }
}

test();
