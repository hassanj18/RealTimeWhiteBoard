# Real-Time Whiteboard (Microservices + Hexagonal)(MERN,Redux,Kafka,.NET 10)

A **real-time collaborative whiteboard system** built using a microservices architecture.  
This project is currently under active development and focuses on scalable real-time collaboration using WebSockets, API Gateway routing, and event-driven communication.

---

## 🚀 Features

- 🔐 Authentication service (user login/register)
- 📦 Board management service (create & manage boards)
- ⚡ Real-time action service (WebSockets for live collaboration)
- 📸 Snapshot Serivice (Saves the State of the Boards)
- 🌐 API Gateway using NGINX
- 🧩 Microservices-based architecture
- 📡 Real-time communication (WebSockets + event-driven design)
- 🐳 Fully containerized using Docker

---

## 🏗️ Architecture Overview
<img width="672" height="708" alt="image" src="https://github.com/user-attachments/assets/4363fafa-6cc3-47f2-b9f1-2a6f0735e295" />
---

## 📂 Services

### 1. Auth Service
- User authentication
- JWT-based auth 

### 2. Board Service
- Creates and manages boards
- Access control for boards (Active Participants)

### 3. Action Service
- WebSocket server 
- Real-time collaboration (drawing/events)
- Handles live board updates
- Designed to be horizentaly Scalable (stateless)
### 4. SnapShot Service
- .NET Worker
- Continously updates the board States
### 5. Frontend Service
- React Based Client 
- Real-time collaboration (drawing/events)
- Redux For State Management
### 6. Nginx 
- Acts as API Gateway for routing
- Load Balancer

---

## 🏗️ Deployment Overview

### AWS deployment:


<img width="533" height="406" alt="image" src="https://github.com/user-attachments/assets/eccef47b-1869-407f-899c-08384c2c04d6" />

## 🐳 Running the Project

### 🔧 Prerequisites
- Docker
- Docker Compose

---

### ▶️ Start the system

```bash
docker-compose up --build
