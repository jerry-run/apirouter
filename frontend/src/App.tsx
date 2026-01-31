import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(JSON.stringify(data)))
      .catch((err) => setHealth(`Error: ${err.message}`));
  }, []);

  return (
    <div className="App">
      <h1>APIRouter</h1>
      <p>Backend status: {health}</p>
    </div>
  );
}

export default App;
