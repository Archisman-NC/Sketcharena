import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket/socket';

interface CanvasBoardProps {
    isDrawer: boolean;
}

export default function CanvasBoard({ isDrawer }: CanvasBoardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set initial drawing properties
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Listen for incoming draw events from the server
        const handleDrawData = (payload: any) => {
            if (payload.type === 'start') {
                ctx.beginPath();
                ctx.moveTo(payload.x, payload.y);
                ctx.strokeStyle = payload.color || 'black';
                ctx.lineWidth = payload.size || 4;
            } else if (payload.type === 'move') {
                ctx.lineTo(payload.x, payload.y);
                ctx.stroke();
            } else if (payload.type === 'end') {
                ctx.beginPath(); // reset path
            }
        };

        socket.on('draw_data', handleDrawData);

        return () => {
            socket.off('draw_data', handleDrawData);
        };
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawer) return;
        const { offsetX, offsetY } = e.nativeEvent;
        setIsDrawing(true);
        socket.emit('draw_start', { x: offsetX, y: offsetY, color: 'black', size: 4 });
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawer || !isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        socket.emit('draw_move', { x: offsetX, y: offsetY });
    };

    const endDrawing = () => {
        if (!isDrawer || !isDrawing) return;
        setIsDrawing(false);
        socket.emit('draw_end');
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <canvas
                ref={canvasRef}
                width={800}
                height={500}
                style={{
                    border: '2px solid #ccc',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: isDrawer ? 'crosshair' : 'default',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    touchAction: 'none'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
            />
        </div>
    );
}
