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
  message: string,
  pooled: boolean,
  scheduled: boolean
) {
  try {
    // Emit a new notification event
    io.emit("new notification", {
      rideId: driver,
      passengerId: passenger,
      message: message,
      pooled: pooled,
      scheduled: scheduled,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}

export async function sendRideRequestNotification1(
  driver: any,
  passenger: any,
  message: string,
  pooled: boolean,
  scheduled: boolean
) {
  try {
    // Emit a new notification event
    io.emit("new notification ask", {
      rideId: driver,
      passengerId: passenger,
      message: message,
      pooled: pooled,
      scheduled: scheduled,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}

export async function sendRideRequestAcceptedNotification(
  passenger: any,
  message: string,
  fareAmount: number,
  rideId: string,
  eta: string,
  distance: number
) {
  try {
    // Emit a new notification event
    io.emit("new notification accepted", {
      userId: passenger._id,
      message: message,
      fareAmount: fareAmount,
      rideId: rideId,
      eta: eta,
      distance: distance,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}

export async function sendRideRequestAcceptedNotificationPooled(
  passenger: any,
  message: string,
  rideId: string,
  distance: number,
  driver: any
) {
  try {
    // Emit a new notification event
    io.emit("new notification accepted pooled", {
      userId: passenger,
      message: message,
      rideId: rideId,
      distance: distance,
      driver: driver,
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
    io.emit("new notification cancel", {
      userId: passenger,
      message: reason,
    });
  } catch (error) {
    console.error(`Failed to send notification: ${error}`);
  }
}

export async function sendDestinationReachedNotification(message: string) {
  try {
    io.emit("new notification destination", {
      message: message,
    });
  } catch (error) {
    console.log(`Failed to send notification: ${error}`);
  }
}
