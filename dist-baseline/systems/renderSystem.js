import { player } from './playerSystem.js';
let canvas = null;
let ctx2d = null;
function initCanvas() {
    canvas = document.getElementById('game');
    if (!canvas)
        return;
    ctx2d = canvas.getContext('2d');
}
export function createRenderSystem(state) {
    return {
        id: 'render', order: 100,
        init: () => { if (typeof window !== 'undefined')
            initCanvas(); },
        update: (_dt, _ctx) => {
            if (!canvas || !ctx2d)
                return;
            ctx2d.save();
            ctx2d.translate(canvas.width / (2 * devicePixelRatio), canvas.height / (2 * devicePixelRatio));
            ctx2d.fillStyle = '#4af';
            ctx2d.beginPath();
            ctx2d.arc(player.x, player.y, 8, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.fillStyle = '#fa4';
            for (const b of state.bullets)
                if (b.alive) {
                    ctx2d.fillRect(b.x - 2, b.y - 2, 4, 4);
                }
            ctx2d.fillStyle = '#f44';
            for (const e of state.enemies)
                if (e.alive) {
                    ctx2d.beginPath();
                    ctx2d.arc(e.x, e.y, 10, 0, Math.PI * 2);
                    ctx2d.fill();
                }
            ctx2d.restore();
        }
    };
}
