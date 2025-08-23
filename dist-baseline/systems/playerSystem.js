export const player = { x: 0, y: 0 };
export function createPlayerSystem(state) {
    return {
        id: 'player', order: -100,
        init: () => {
            player.x = 0;
            player.y = 0;
        },
        update: (_dt, _ctx) => {
        }
    };
}
