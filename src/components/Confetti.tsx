import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

export function Confetti({ isActive }: { isActive: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  
  useEffect(() => {
    if (!isActive) {
      setPieces([]);
      return;
    }
    
    const colors = [
      "hsl(280, 85%, 60%)",
      "hsl(195, 90%, 50%)",
      "hsl(170, 100%, 50%)",
      "hsl(45, 100%, 50%)",
      "hsl(120, 70%, 50%)",
      "hsl(330, 85%, 60%)",
    ];
    
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 50; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      });
    }
    
    setPieces(newPieces);
    
    const timeout = setTimeout(() => {
      setPieces([]);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [isActive]);
  
  if (pieces.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${piece.x}%`,
            top: "-10px",
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}