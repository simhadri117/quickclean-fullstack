# Use Node.js 22 Alpine as the base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5174

# Command to run the application in development mode
# Vite needs --host to be accessible from outside the container
# We explicitly set the port to 5174
CMD ["npm", "run", "dev", "--", "--host", "--port", "5174"]
