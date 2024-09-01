const express = require('express');
const exampleQueue = require('./queues/exampleQueue');
const arena = require('./config/arena');

const app = express();

app.use(express.json());

app.use('/', arena);

app.use('/', (req, res) => {
    res.send('hello');
});

app.post('/add-job', async (req, res) => {
    const jobData = req.body;
    const job = await exampleQueue.createJob(jobData).save();
    res.json({ jobId: job.id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
