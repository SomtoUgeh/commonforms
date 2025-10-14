import { useState } from "react";
import viteLogo from "/vite.svg";
import reactLogo from "./assets/react.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" rel="noopener" target="_blank">
          <img
            alt="Vite logo"
            className="logo"
            height="200"
            src={viteLogo}
            width="200"
          />
        </a>
        <a href="https://react.dev" rel="noopener" target="_blank">
          <img
            alt="React logo"
            className="logo react"
            height="200"
            src={reactLogo}
            width="200"
          />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() => setCount((prevCount) => prevCount + 1)}
          type="button"
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
