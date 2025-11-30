const fetch = require('node-fetch');

async function testMessageSave() {
    try {
        const response = await fetch('http://localhost:8000/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderId: 1,
                receiverId: null,
                roomId: 'test_room_123',
                content: 'Test message from script',
                originalLang: 'en'
            })
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Body:', text);

        if (response.ok) {
            console.log('SUCCESS: Message saved via PHP API');
        } else {
            console.log('FAILURE: API returned error');
        }
    } catch (error) {
        console.error('ERROR:', error);
    }
}

testMessageSave();
