/**
 * Exercise 1: Basic Concepts Practice
 * Compare MySQL vs Cassandra basic operations
 */

const database = require('../../config/database');

class Exercise01 {
    constructor() {
        this.completed = {
            setup: false,
            basicOperations: false,
            dataTypes: false,
            primaryKeys: false
        };
    }

    async run() {
        console.log('🎓 EXERCISE 1: Basic Concepts Practice');
        console.log('📚 Comparing MySQL vs Cassandra fundamentals\n');

        try {
            await database.connect();

            console.log('=== PART 1: SETUP & BASIC OPERATIONS ===');
            await this.setupBasicOperations();

            console.log('\n=== PART 2: DATA TYPES COMPARISON ===');
            await this.dataTypesComparison();

            console.log('\n=== PART 3: PRIMARY KEYS UNDERSTANDING ===');
            await this.primaryKeysExercise();

            console.log('\n=== PART 4: QUIZ ===');
            await this.quiz();

            this.showResults();

        } catch (error) {
            console.error('❌ Exercise failed:', error);
        } finally {
            await database.disconnect();
        }
    }

    async setupBasicOperations() {
        console.log('📖 MySQL way (what you know):');
        console.log(`
-- MySQL: Create database and table
CREATE DATABASE learning;
USE learning;

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    age INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
        `);

        console.log('🔄 Cassandra equivalent:');
        const client = database.getClient();

        try {
            // Create table for exercise
            await client.execute(`
                CREATE TABLE IF NOT EXISTS learning_students (
                    student_id UUID PRIMARY KEY,
                    name TEXT,
                    email TEXT,
                    age INT,
                    created_at TIMESTAMP
                )
            `);

            console.log('✅ Cassandra table created successfully!');
            console.log(`
-- Cassandra CQL:
CREATE TABLE learning_students (
    student_id UUID PRIMARY KEY,    -- UUID instead of AUTO_INCREMENT
    name TEXT,                      -- TEXT instead of VARCHAR
    email TEXT,
    age INT,
    created_at TIMESTAMP            -- No DEFAULT values
);
            `);

            console.log('🤔 Key differences you notice:');
            console.log('   1. UUID vs AUTO_INCREMENT');
            console.log('   2. TEXT vs VARCHAR');
            console.log('   3. No DEFAULT values in Cassandra');
            console.log('   4. Must specify keyspace replication');

            this.completed.setup = true;

        } catch (error) {
            console.log('❌ Error creating table:', error.message);
        }
    }

    async dataTypesComparison() {
        console.log('📊 Data Types Mapping:');

        const typeMapping = `
┌─────────────────┬─────────────────┬─────────────────────┐
│ MySQL Type      │ Cassandra Type  │ Notes               │
├─────────────────┼─────────────────┼─────────────────────┤
│ INT             │ INT             │ Same                │
│ BIGINT          │ BIGINT          │ Same                │
│ VARCHAR(n)      │ TEXT            │ No size limit       │
│ TEXT            │ TEXT            │ Same                │
│ TIMESTAMP       │ TIMESTAMP       │ Different precision │
│ DATE            │ DATE            │ Same                │
│ BOOLEAN         │ BOOLEAN         │ Same                │
│ DECIMAL         │ DECIMAL         │ Same                │
│ BLOB            │ BLOB            │ Same                │
│ JSON            │ Not supported   │ Use collections     │
│ ENUM            │ Not supported   │ Use TEXT            │
│ AUTO_INCREMENT  │ Not supported   │ Use UUID            │
└─────────────────┴─────────────────┴─────────────────────┘
        `;

        console.log(typeMapping);

        console.log('\n🆕 Cassandra-specific types:');
        console.log('   UUID - Universally unique identifier');
        console.log('   COUNTER - Auto-incrementing number');
        console.log('   SET<type> - Collection of unique values');
        console.log('   LIST<type> - Ordered collection');
        console.log('   MAP<key_type, value_type> - Key-value pairs');

        // Demo collections
        const client = database.getClient();
        try {
            await client.execute(`
                CREATE TABLE IF NOT EXISTS user_preferences (
                    user_id UUID PRIMARY KEY,
                    favorite_colors SET<TEXT>,
                    todo_list LIST<TEXT>,
                    settings MAP<TEXT, TEXT>
                )
            `);

            console.log('\n✅ Demo: Collections table created');
            console.log(`
-- Cassandra collections example:
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY,
    favorite_colors SET<TEXT>,      -- {'red', 'blue', 'green'}
    todo_list LIST<TEXT>,           -- ['task1', 'task2', 'task3']
    settings MAP<TEXT, TEXT>        -- {'theme': 'dark', 'lang': 'en'}
);
            `);

            this.completed.dataTypes = true;

        } catch (error) {
            console.log('❌ Collections demo error:', error.message);
        }
    }

    async primaryKeysExercise() {
        console.log('🔑 Understanding Primary Keys:');

        console.log('\n📖 MySQL Primary Key (what you know):');
        console.log(`
-- MySQL: Simple primary key
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- Uniquely identifies row
    name VARCHAR(100)
);

-- MySQL: Composite primary key
CREATE TABLE enrollment (
    student_id INT,
    course_id INT,
    grade CHAR(1),
    PRIMARY KEY (student_id, course_id)  -- Both together unique
);
        `);

        console.log('🔄 Cassandra Primary Key (different concept):');

        const client = database.getClient();

        try {
            // Demo compound primary key
            await client.execute(`
                CREATE TABLE IF NOT EXISTS student_grades (
                    student_id UUID,
                    semester TEXT,
                    course_id UUID,
                    course_name TEXT,
                    grade TEXT,
                    credits INT,
                    PRIMARY KEY (student_id, semester, course_id)
                ) WITH CLUSTERING ORDER BY (semester DESC, course_id ASC)
            `);

            console.log('✅ Compound primary key table created');
            console.log(`
-- Cassandra: Compound primary key
CREATE TABLE student_grades (
    student_id UUID,    -- PARTITION KEY (determines storage node)
    semester TEXT,      -- CLUSTERING COLUMN (determines order)
    course_id UUID,     -- CLUSTERING COLUMN (determines order)
    course_name TEXT,
    grade TEXT,
    PRIMARY KEY (student_id, semester, course_id)
) WITH CLUSTERING ORDER BY (semester DESC, course_id ASC);

-- Breakdown:
-- student_id = Partition Key (where data is stored)
-- semester, course_id = Clustering Columns (how data is sorted)
            `);

            console.log('\n🧠 Key Concepts:');
            console.log('   📍 PARTITION KEY: Determines which node stores data');
            console.log('   📊 CLUSTERING COLUMNS: Determine sort order within partition');
            console.log('   🎯 COMPOUND KEY: Partition Key + Clustering Columns');

            // Demo queries that work well
            console.log('\n✅ Efficient queries (use partition key):');
            console.log('   SELECT * FROM student_grades WHERE student_id = ?');
            console.log('   SELECT * FROM student_grades WHERE student_id = ? AND semester = ?');

            console.log('\n❌ Inefficient queries (missing partition key):');
            console.log('   SELECT * FROM student_grades WHERE semester = ?  -- Requires ALLOW FILTERING');
            console.log('   SELECT * FROM student_grades WHERE grade = \'A\'  -- Requires ALLOW FILTERING');

            this.completed.primaryKeys = true;

        } catch (error) {
            console.log('❌ Primary key demo error:', error.message);
        }
    }

    async quiz() {
        console.log('🧪 QUIZ TIME! Test your understanding:');

        const questions = [
            {
                question: "What is the Cassandra equivalent of MySQL's AUTO_INCREMENT?",
                options: ["A) SERIAL", "B) UUID", "C) COUNTER", "D) SEQUENCE"],
                correct: "B",
                explanation: "UUID generates unique IDs. COUNTER is for incrementing numbers, not primary keys."
            },
            {
                question: "In Cassandra, what determines which node stores your data?",
                options: ["A) Clustering Column", "B) Secondary Index", "C) Partition Key", "D) Table Name"],
                correct: "C",
                explanation: "Partition Key is hashed to determine storage node in the cluster."
            },
            {
                question: "Can you use DEFAULT values in Cassandra table definitions?",
                options: ["A) Yes, like MySQL", "B) No, handle in application", "C) Only for timestamps", "D) Only for numbers"],
                correct: "B",
                explanation: "Cassandra doesn't support DEFAULT values. Handle defaults in your application code."
            },
            {
                question: "What's the MySQL equivalent of a Cassandra Keyspace?",
                options: ["A) Table", "B) Schema/Database", "C) Index", "D) View"],
                correct: "B",
                explanation: "Keyspace in Cassandra = Database/Schema in MySQL. Both are top-level containers for tables."
            }
        ];

        let score = 0;
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            console.log(`\n${i + 1}. ${q.question}`);
            q.options.forEach(option => console.log(`   ${option}`));

            // Simulate user answer (in real implementation, you'd get input)
            const userAnswer = q.correct; // Auto-correct for demo
            console.log(`   Your answer: ${userAnswer}`);

            if (userAnswer === q.correct) {
                console.log('   ✅ Correct!');
                score++;
            } else {
                console.log(`   ❌ Wrong. Correct answer: ${q.correct}`);
            }
            console.log(`   💡 ${q.explanation}`);
        }

        console.log(`\n🎯 Quiz Score: ${score}/${questions.length}`);

        if (score === questions.length) {
            console.log('🎉 Perfect! You understand the basics!');
            this.completed.basicOperations = true;
        } else if (score >= questions.length * 0.7) {
            console.log('👍 Good job! Review the missed concepts.');
        } else {
            console.log('📚 Need more study. Re-read Chapter 1: Basic Concepts.');
        }
    }

    showResults() {
        console.log('\n📊 EXERCISE 1 COMPLETION:');

        const completionStatus = Object.entries(this.completed).map(([task, completed]) => {
            return `${completed ? '✅' : '❌'} ${task}`;
        }).join('\n');

        console.log(completionStatus);

        const completedCount = Object.values(this.completed).filter(Boolean).length;
        const total = Object.keys(this.completed).length;

        console.log(`\n🎯 Overall Progress: ${completedCount}/${total} (${Math.round(completedCount/total*100)}%)`);

        if (completedCount === total) {
            console.log('\n🚀 EXCELLENT! Ready for Exercise 2: Data Modeling');
            console.log('   Run: node Learn/exercises/exercise-02.js');
        } else {
            console.log('\n📖 Review these topics:');
            Object.entries(this.completed).forEach(([task, completed]) => {
                if (!completed) {
                    console.log(`   - ${task}`);
                }
            });
        }

        console.log('\n📚 Additional Resources:');
        console.log('   - Read: Learn/01-basic-concepts.md');
        console.log('   - Read: Learn/04-data-modeling.md');
        console.log('   - Practice: Try creating your own tables!');
    }
}

// Helper function to simulate user input (for demo purposes)
function simulateUserInput(prompt, options) {
    // In real implementation, use readline or similar
    console.log(prompt);
    options.forEach((option, index) => {
        console.log(`${index + 1}. ${option}`);
    });

    // Return random choice for demo
    return options[Math.floor(Math.random() * options.length)];
}

// Run exercise if called directly
if (require.main === module) {
    const exercise = new Exercise01();

    console.log('🎓 Welcome to Cassandra Learning - Exercise 1!');
    console.log('📋 This exercise covers basic concepts comparison with MySQL');
    console.log('⏱️  Estimated time: 15-20 minutes\n');

    exercise.run().then(() => {
        console.log('\n✨ Exercise 1 completed!');
        console.log('🔜 Next: Exercise 2 - Data Modeling Practice');
    });
}

module.exports = Exercise01;
