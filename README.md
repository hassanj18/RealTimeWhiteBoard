# 🧠 Real-Time Whiteboard (Microservices + WebSockets + Kafka)

A **real-time collaborative whiteboard system** built using a microservices architecture.  
This project is currently under active development and focuses on scalable real-time collaboration using WebSockets, API Gateway routing, and event-driven communication.

---

## 🚀 Features

- 🔐 Authentication service (user login/register)
- 📦 Board management service (create & manage boards)
- ⚡ Real-time action service (WebSockets for live collaboration)
- 🌐 API Gateway using NGINX
- 🧩 Microservices-based architecture
- 📡 Real-time communication (WebSockets + event-driven design)
- 🐳 Fully containerized using Docker

---

## 🏗️ Architecture Overview

Each service runs independently and communicates through HTTP (and later event streaming via Kafka in future versions).
Client (React)
↓
NGINX API Gateway
├── /auth → Auth Service
├── /board → Board Service
└── /ws → Action Service (WebSocket)
---

## 📂 Services

### 1. Auth Service
- User authentication
- JWT-based login system

### 2. Board Service
- Create and manage boards
- Access control for boards

### 3. Action Service
- WebSocket server
- Real-time collaboration (drawing/events)
- Handles live board updates

---

## 🐳 Running the Project

### 🔧 Prerequisites
- Docker
- Docker Compose

---

### ▶️ Start the system

```bash
docker-compose up --build
