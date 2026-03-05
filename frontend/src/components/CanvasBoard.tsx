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

const COLORS = [
    '#111827', '#6b7280', '#ffffff',
    '#ef4444', '#f97316', '#facc15',
    '#22c55e', '#14b8a6', '#3b82f6',
    '#6366f1', '#a855f7', '#ec4899',
];
const SIZE_PRESETS = [2, 5, 10, 16];

export default function CanvasBoard({ isDrawer }: CanvasBoardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Tools state
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentSize, setCurrentSize] = useState(5);
    const [isEraser, setIsEraser] = useState(false);

    // Drawing state
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const lastEmitRef = useRef<number>(0);
    const pointerIdRef = useRef<number | null>(null);

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

    const getCanvasPointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();

        // Context is already scaled by devicePixelRatio via ctx.setTransform, 
        // so we strictly need logical CSS pixels within the canvas box.
        const scaleX = canvas.clientWidth / rect.width;
        const scaleY = canvas.clientHeight / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    useEffect(() => {
        // Keep canvas sized to its container while preserving internal coordinate space scaling.
        // We maintain a fixed aspect ratio (16:10) and adjust internal resolution for crispness.
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resize = () => {
            const maxWidth = container.clientWidth;
            const targetWidth = Math.min(900, Math.max(320, maxWidth));
            const targetHeight = Math.round(targetWidth * (10 / 16));
            const dpr = Math.min(2, window.devicePixelRatio || 1);

            canvas.style.width = `${targetWidth}px`;
            canvas.style.height = `${targetHeight}px`;
            canvas.width = Math.round(targetWidth * dpr);
            canvas.height = Math.round(targetHeight * dpr);

            const ctx = canvas.getContext('2d');
            if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            redrawCanvas(strokes);
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        window.addEventListener('resize', resize);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', resize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes]);

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
                setIsEraser(Boolean(payload.value));
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
        const next = !isEraser;
        setIsEraser(next);
        socket.emit('draw_tool', { type: 'eraser', value: next });
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
    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawer) return;
        if (e.button !== 0) return;
        const pt = getCanvasPointFromEvent(e);
        if (!pt) return;
        const { x: offsetX, y: offsetY } = pt;
        setIsDrawing(true);
        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);

        const activeColor = isEraser ? '#ffffff' : currentColor;

        currentStrokeRef.current = {
            color: activeColor,
            size: currentSize,
            points: [{ x: offsetX, y: offsetY }]
        };

        socket.emit('draw_start', { x: offsetX, y: offsetY, color: activeColor, size: currentSize });
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawer || !isDrawing || !currentStrokeRef.current) return;
        if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
        const pt = getCanvasPointFromEvent(e);
        if (!pt) return;
        const { x: offsetX, y: offsetY } = pt;

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

    const endDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawer || !isDrawing || !currentStrokeRef.current) return;
        setIsDrawing(false);
        const strokeToSave = currentStrokeRef.current;
        setStrokes(prev => [...prev, strokeToSave]);
        currentStrokeRef.current = null;
        if (e && pointerIdRef.current !== null) {
            try {
                e.currentTarget.releasePointerCapture(pointerIdRef.current);
            } catch {
                // no-op
            }
        }
        pointerIdRef.current = null;
        socket.emit('draw_end');
    };

    return (
        <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <canvas
                ref={canvasRef}
                width={800}
                height={500}
                style={{
                    border: '1px solid rgba(148,163,184,0.5)',
                    borderRadius: '12px',
                    backgroundColor: 'white',
                    cursor: isDrawer ? (isEraser ? 'cell' : 'crosshair') : 'default',
                    boxShadow: 'var(--shadow-md)',
                    touchAction: 'none'
                }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={endDrawing}
                onPointerCancel={endDrawing}
                onPointerLeave={endDrawing}
            />

            {/* Toolbar (below canvas, like skribbl) */}
            <div style={{
                width: '100%',
                maxWidth: 900,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                padding: '12px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.35)',
                boxShadow: 'var(--shadow-sm)',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>Color</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                title="Brush color"
                                onClick={() => isDrawer && changeColor(c)}
                                disabled={!isDrawer}
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '999px',
                                    backgroundColor: c,
                                    border: (!isEraser && currentColor === c) ? '2px solid #111827' : '1px solid rgba(148,163,184,0.6)',
                                    outline: c === '#ffffff' ? '1px solid rgba(148,163,184,0.8)' : 'none',
                                    boxShadow: 'none',
                                    padding: 0,
                                    cursor: isDrawer ? 'pointer' : 'not-allowed',
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>Size</span>
                    <input
                        type="range"
                        min={2}
                        max={24}
                        value={currentSize}
                        disabled={!isDrawer}
                        onChange={(e) => changeSize(Number(e.target.value))}
                        style={{ width: 140, boxShadow: 'none' }}
                        aria-label="Brush size"
                    />
                    <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '999px',
                        border: '1px solid rgba(148,163,184,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                    }}>
                        <div style={{
                            width: Math.min(20, currentSize),
                            height: Math.min(20, currentSize),
                            borderRadius: '999px',
                            backgroundColor: isEraser ? '#e5e7eb' : '#111827',
                        }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {SIZE_PRESETS.map(s => (
                            <button
                                key={s}
                                title={`Set size to ${s}px`}
                                onClick={() => isDrawer && changeSize(s)}
                                disabled={!isDrawer}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 10,
                                    backgroundColor: currentSize === s ? '#eef2ff' : '#ffffff',
                                    color: '#111827',
                                    border: '1px solid rgba(148,163,184,0.6)',
                                    boxShadow: 'none',
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        type="button"
                        title="Toggle eraser"
                        onClick={toggleEraser}
                        disabled={!isDrawer}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 12,
                            backgroundColor: isEraser ? '#fde68a' : '#ffffff',
                            color: '#111827',
                            border: '1px solid rgba(148,163,184,0.6)',
                            boxShadow: 'none',
                            fontWeight: 700,
                        }}
                    >
                        Eraser
                    </button>
                    <button
                        type="button"
                        title="Undo last stroke"
                        onClick={undoStroke}
                        disabled={!isDrawer || strokes.length === 0}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 12,
                            backgroundColor: '#ffffff',
                            color: '#111827',
                            border: '1px solid rgba(148,163,184,0.6)',
                            boxShadow: 'none',
                            fontWeight: 700,
                            opacity: (!isDrawer || strokes.length === 0) ? 0.5 : 1,
                        }}
                    >
                        Undo
                    </button>
                    <button
                        type="button"
                        title="Clear canvas"
                        onClick={clearCanvas}
                        disabled={!isDrawer || strokes.length === 0}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 12,
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid rgba(248,113,113,0.7)',
                            boxShadow: 'none',
                            fontWeight: 800,
                            opacity: (!isDrawer || strokes.length === 0) ? 0.5 : 1,
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}
