// turnConfig = {
//   iceServers: [
//     { 
//       urls: ["stun:16.16.216.215:3478"] 
//     },
//     {
//       urls: "turn:16.16.216.215:3478?transport=tcp",
//       username: "app",
//       credential: "user",
      
//     },
//   ],
// };

turnConfig = {
  iceServers: [
    {
        urls: ["stun:217.165.108.96:3478"]
    },
    {
        urls: "turn:217.165.108.96:3478?transport=udp",
        username: "turn",
        credential: "server",
    },
],
};
