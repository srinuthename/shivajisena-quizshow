const express = require('express');
const router = express.Router();

// Dummy endpoint to return random viewer votes
router.post('/', (req, res) => {
  const { numOptions = 4 } = req.body;
  
  // Generate 15-25 random viewer votes distributed across options
  const totalVotes = Math.floor(Math.random() * 11) + 15; // 15-25 votes
  const votes = [];
  
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'];
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kelly', 'Liam', 'Maya', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Ruby', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zane'];
  
  for (let i = 0; i < totalVotes; i++) {
    const choice = Math.floor(Math.random() * numOptions);
    const name = names[Math.floor(Math.random() * names.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    votes.push({
      choice,
      fullname: name,
      channelid: `user${i + 1}`,
      avatar: {
        initial: name.charAt(0),
        color: color,
        url: `https://randomuser.me/api/portraits/lego/${(i % 8) + 1}.jpg`
      }
    });
  }
  
  res.json({ votes });
});

module.exports = router;