export function createRandomCounterSystem(id = 'randomCounter') {
    const values = [];
    const system = {
        id,
        update: (_dt, ctx) => {
            values.push(ctx.rng.int(0, 100));
        }
    };
    return {
        system,
        getValues: () => values.slice(),
        reset: () => { values.length = 0; }
    };
}
