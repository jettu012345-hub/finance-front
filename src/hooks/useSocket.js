import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';

let socketInstance = null;

const useSocket = () => {
  const { token, user } = useAuthStore();
  const { team, updateBalance } = useTeamStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !team?._id) return;

    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });
    }

    socketRef.current = socketInstance;
    socketInstance.emit('join_team', team._id);

    socketInstance.on('balance_updated', ({ balance }) => {
      updateBalance(balance);
    });

    return () => {
      // Keep alive — don't disconnect on unmount
    };
  }, [token, team?._id]);

  return socketRef.current || socketInstance;
};

export default useSocket;
