import { io } from "../socket";

io.on("connection", (socket) => {
  // Listen for a new notification event
  socket.on("new notification", (notification) => {
    // Emit the notification to the user
    socket.to(notification.userId).emit("notification", notification);
  });
});

export async function sendRideRequestNotification(
  driver: any,
  message: string
) {
  try {
    // Emit a new notification event
    io.emit("new notification", {
      userId: driver._id,
      message: message,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}

export async function sendRideRequestAcceptedNotification(
  passenger: any,
  message: string,
  fareAmount: number
) {
  try {
    // Emit a new notification event
    io.emit("new notification accepted", {
      userId: passenger._id,
      message: message,
      fareAmount: fareAmount,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}
