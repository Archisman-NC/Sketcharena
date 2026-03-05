import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket/socket';

interface CanvasBoardProps {
    isDrawer: boolean;
}

interface Point {
    x: number;
    y: number;
}

interface Stroke {
    color: string;
    size: number;
    points: Point[];
}

const COLORS = ['#000000', '#ff0000', '#0000ff', '#008000', '#ffff00'];
const SIZES = [2, 5, 10];

export default function CanvasBoard({ isDrawer }: CanvasBoardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Tools state
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentSize, setCurrentSize] = useState(5);
    const [isEraser, setIsEraser] = useState(false);

    // Drawing state
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const lastEmitRef = useRef<number>(0);

    // Re-draw the entire canvas based on current strokes array
    const redrawCanvas = (allStrokes: Stroke[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        allStrokes.forEach(stroke => {
            if (!stroke || !stroke.points || stroke.points.length === 0) return;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            stroke.points.forEach(p => {
                ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });
    };

    useEffect(() => {
        redrawCanvas(strokes);
    }, [strokes]);

    useEffect(() => {
        const handleDrawData = (payload: any) => {
            if (isDrawer) return; // Drawer handles locally for zero lag

            if (payload.type === 'start') {
                currentStrokeRef.current = {
                    color: payload.color,
                    size: payload.size,
                    points: [{ x: payload.x, y: payload.y }]
                };
            } else if (payload.type === 'move' && currentStrokeRef.current) {
                currentStrokeRef.current.points.push({ x: payload.x, y: payload.y });
                // We could optimise by just drawing the line segment, but for simplicity we rely on React state 
                // However, directly drawing the segment is faster for viewers. Let's draw the segment!
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (ctx) {
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    const pts = currentStrokeRef.current.points;
                    if (pts.length >= 2) {
                        ctx.beginPath();
                        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
                        ctx.lineTo(payload.x, payload.y);
                        ctx.strokeStyle = currentStrokeRef.current.color;
                        ctx.lineWidth = currentStrokeRef.current.size;
                        ctx.stroke();
                    }
                }
            } else if (payload.type === 'end' && currentStrokeRef.current) {
                const strokeToSave = currentStrokeRef.current;
                setStrokes(prev => [...prev, strokeToSave]);
                currentStrokeRef.current = null;
            }
        };

        const handleToolUpdate = (payload: any) => {
            if (isDrawer) return; // Ignore if drawer (already updated local state)
            if (payload.type === 'color') {
                setCurrentColor(payload.value as string);
                setIsEraser(false);
            } else if (payload.type === 'brush_size') {
                setCurrentSize(payload.value as number);
            } else if (payload.type === 'eraser') {
                setIsEraser(true);
            }
        };

        const handleUndo = () => {
            setStrokes(prev => prev.slice(0, -1));
        };

        const handleClear = () => {
            setStrokes([]);
        };

        socket.on('draw_data', handleDrawData);
        socket.on('tool_update', handleToolUpdate);
        socket.on('undo_stroke', handleUndo);
        socket.on('clear_canvas', handleClear);

        return () => {
            socket.off('draw_data', handleDrawData);
            socket.off('tool_update', handleToolUpdate);
            socket.off('undo_stroke', handleUndo);
            socket.off('clear_canvas', handleClear);
        };
    }, [isDrawer]);

    // Toolbar actions for drawer
    const changeColor = (color: string) => {
        setCurrentColor(color);
        setIsEraser(false);
        socket.emit('draw_tool', { type: 'color', value: color });
    };

    const changeSize = (size: number) => {
        setCurrentSize(size);
        socket.emit('draw_tool', { type: 'brush_size', value: size });
    };

    const toggleEraser = () => {
        setIsEraser(true);
        socket.emit('draw_tool', { type: 'eraser', value: true });
    };

    const undoStroke = () => {
        socket.emit('draw_undo');
        // Because the drawer might also drop it from state directly or relying on server:
        // Actually the drawer listens to undo_stroke? 
        // Oh wait, in the useEffect I didn't ignore undo_stroke for the Drawer! So the socket event handles it.
    };

    const clearCanvas = () => {
        socket.emit('canvas_clear');
        // Drawer relies on socket event to clear its own state.
    };

    // Drawing handlers for drawer
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawer) return;
        const { offsetX, offsetY } = e.nativeEvent;
        setIsDrawing(true);

        const activeColor = isEraser ? '#ffffff' : currentColor;

        currentStrokeRef.current = {
            color: activeColor,
            size: currentSize,
            points: [{ x: offsetX, y: offsetY }]
        };

        socket.emit('draw_start', { x: offsetX, y: offsetY, color: activeColor, size: currentSize });
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawer || !isDrawing || !currentStrokeRef.current) return;
        const { offsetX, offsetY } = e.nativeEvent;

        const pts = currentStrokeRef.current.points;
        const lastPt = pts[pts.length - 1];

        // Optimization: Do not push consecutive identical coordinates or sub-3px drags
        // This prevents the points array from ballooning to 10k+ items per smooth stroke
        if (lastPt) {
            const dx = offsetX - lastPt.x;
            const dy = offsetY - lastPt.y;
            if (dx * dx + dy * dy < 9) return;
        }

        currentStrokeRef.current.points.push({ x: offsetX, y: offsetY });

        // Draw local line segment instantly
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            if (pts.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
                ctx.lineTo(offsetX, offsetY);
                ctx.strokeStyle = currentStrokeRef.current.color;
                ctx.lineWidth = currentStrokeRef.current.size;
                ctx.stroke();
            }
        }

        const now = Date.now();
        if (now - lastEmitRef.current > 40) { // Limit to 25 FPS socket emits
            socket.emit('draw_move', { x: offsetX, y: offsetY });
            lastEmitRef.current = now;
        }
    };

    const endDrawing = () => {
        if (!isDrawer || !isDrawing || !currentStrokeRef.current) return;
        setIsDrawing(false);
        const strokeToSave = currentStrokeRef.current;
        setStrokes(prev => [...prev, strokeToSave]);
        currentStrokeRef.current = null;
        socket.emit('draw_end');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>

            {/* Toolbar */}
            <div style={{
                display: 'flex', gap: '15px', padding: '10px', marginBottom: '10px',
                backgroundColor: '#f1f1f1', borderRadius: '8px', border: '1px solid #ccc',
                width: '800px', boxSizing: 'border-box', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Colors:</span>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => isDrawer && changeColor(c)}
                            disabled={!isDrawer}
                            style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                backgroundColor: c, border: (!isEraser && currentColor === c) ? '3px solid #666' : '1px solid #ccc',
                                cursor: isDrawer ? 'pointer' : 'not-allowed'
                            }}
                        />
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: '15px' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Size:</span>
                    {SIZES.map(s => (
                        <button
                            key={s}
                            onClick={() => isDrawer && changeSize(s)}
                            disabled={!isDrawer}
                            style={{
                                padding: '4px 8px', borderRadius: '4px',
                                backgroundColor: currentSize === s ? '#ddd' : 'white',
                                border: '1px solid #ccc', cursor: isDrawer ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {s}px
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                    <button
                        onClick={toggleEraser}
                        disabled={!isDrawer}
                        style={{
                            padding: '6px 12px', borderRadius: '4px',
                            backgroundColor: isEraser ? '#ffcc00' : 'white', cursor: isDrawer ? 'pointer' : 'not-allowed',
                            border: '1px solid #ccc', fontWeight: 'bold'
                        }}
                    >
                        Erase
                    </button>
                    <button
                        onClick={undoStroke}
                        disabled={!isDrawer}
                        style={{
                            padding: '6px 12px', borderRadius: '4px',
                            backgroundColor: 'white', cursor: isDrawer ? 'pointer' : 'not-allowed',
                            border: '1px solid #ccc'
                        }}
                    >
                        Undo
                    </button>
                    <button
                        onClick={clearCanvas}
                        disabled={!isDrawer}
                        style={{
                            padding: '6px 12px', borderRadius: '4px',
                            backgroundColor: '#ff4c4c', color: 'white', cursor: isDrawer ? 'pointer' : 'not-allowed',
                            border: '1px solid #ccc'
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={800}
                height={500}
                style={{
                    border: '2px solid #ccc',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: isDrawer ? (isEraser ? 'cell' : 'crosshair') : 'default',
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
