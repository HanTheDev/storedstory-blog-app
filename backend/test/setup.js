const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Close any previous connection
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    // Connect to the in-memory database
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

beforeEach(async () => {
    // Clear the database between tests
    await mongoose.connection.db.dropDatabase();
});

after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});
