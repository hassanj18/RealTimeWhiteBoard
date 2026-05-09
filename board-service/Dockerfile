# Use an official Node.js runtime as a parent image
FROM node:18

# Create a directory where our app will be placed
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the Docker image
COPY package*.json ./

# Install dependencies in the Docker image
RUN npm install

# Copy the rest of the app to the Docker image
COPY . .

# Expose the port that our app runs in
EXPOSE 3029

# Serve the app via node
CMD [ "node", "main.js" ]
