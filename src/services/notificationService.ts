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
  passenger: any,
  message: string
) {
  try {
    // Emit a new notification event
    io.emit("new notification", {
      driverId: driver._id,
      passengerId: passenger,
      message: message,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}

export async function sendRideRequestAcceptedNotification(
  passenger: any,
  message: string,
  fareAmount: number,
  rideId: string
) {
  try {
    // Emit a new notification event
    io.emit("new notification accepted", {
      userId: passenger._id,
      message: message,
      fareAmount: fareAmount,
      rideId: rideId,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}

export async function sendRideRequestCancelledNotification(
  passenger: any,
  reason: string
) {
  try {
    // Emit a new notification event
    io.emit("new notification", {
      userId: passenger,
      message: reason,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}
