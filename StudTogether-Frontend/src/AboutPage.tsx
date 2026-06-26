import React from "react";
import { Link } from "react-router-dom";

const AboutPage: React.FC = () => (
  <div className="st-page">
    <div className="st-navbar">
      <div className="st-shell st-navInner">
        <Link to="/" className="st-brand st-brandLink">
          <div className="st-brandMark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span>RealTimeWhiteBoard</span>
        </Link>
        <Link className="st-link" to="/">
          Back to home
        </Link>
      </div>
    </div>

    <div className="st-shell st-aboutContent">
      <h1>About RealTimeWhiteBoard</h1>
      <p>
        RealTimeWhiteBoard is a real-time collaborative whiteboard where teams draw, annotate, and brainstorm
        together on a shared canvas. Built as a microservices system with Kafka event streaming, WebSocket
        sync, and snapshot persistence.
      </p>
      <ul>
        <li>Frontend: React, Redux, Vite</li>
        <li>Backend: Node.js microservices + .NET snapshot service</li>
        <li>Database: MongoDB</li>
        <li>Messaging: Kafka (boards.actions / boards.info)</li>
      </ul>
    </div>
  </div>
);

export default AboutPage;
