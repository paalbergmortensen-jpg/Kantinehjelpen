fetch('http://localhost:3000/api/seed', { method: 'POST' })
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
