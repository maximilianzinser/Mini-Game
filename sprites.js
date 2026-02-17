// sprites.js
// Simple sprite generator using pixel arrays

const COLORS = {
    _: 'transparent',
    r: '#E70000', // Red
    b: '#3F1600', // Brown (Hair/Boots)
    s: '#FFCAB0', // Skin
    o: '#2233AA', // Overalls (Blue)
    y: '#FFD700', // Yellow
    g: '#00AA00', // Green
    w: '#FFFFFF', // White
    k: '#000000', // Black
    B: '#A05000', // Brick Brown
    G: '#808080', // Grey
    L: '#00FF00', // Lime
    O: '#FF8800'  // Orange
};

function createSprite(pixels, scale = 2) {
    const canvas = document.createElement('canvas');
    const h = pixels.length;
    const w = pixels[0].length;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const char = pixels[y][x];
            if (char !== ' ' && COLORS[char]) {
                ctx.fillStyle = COLORS[char];
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }
    return canvas;
}

// Pixel Maps (12x16 approx for chars)
const SPRITES = {
    player: {
        idle: createSprite([
            "___rrrrr____",
            "__rrrrrrrr__",
            "__bbbsss____",
            "_bbfssssb___",
            "_bfsfsssb___",
            "__bssssbb___",
            "___oooooo___",
            "__rorooror__",
            "__oooooo____",
            "_oooooooo___",
            "_s_o__o_s___",
            "___o__o_____",
            "__oo__oo____",
            "__bb__bb____"
        ], 3),
        jump: createSprite([
            "___rrrrr____",
            "__rrrrrrrr__",
            "__bbbsss____",
            "_bbfssssb___",
            "__bssssbb___",
            "___s_o______",
            "__rooooo____",
            "__oooooor___",
            "_oooooooo___",
            "_s_o__o_s___",
            "___o__o_____",
            "___bb_bb____"
        ], 3)
    },
    goomba: createSprite([
        "____bbbb____",
        "___bkkkkb___",
        "__bkkkkkkb__",
        "__bkskkskb__",
        "__bkskkskb__",
        "__bkkkkkkb__",
        "___bbbbbb___",
        "____k__k____",
        "___kk__kk___"
    ], 3),
    brick: createSprite([
        "BBBBBBBB",
        "B_BB_BBB",
        "BBBBBBBB",
        "BB_BBB_B",
        "BBBBBBBB",
        "BBB_BB_B",
        "BBBBBBBB",
        "B_BB_BBB"
    ], 5),
    ground: createSprite([
        "BBBBBBBB",
        "GGBBBBBG",
        "BGGBBBGB",
        "BBGGBGBB",
        "BBBGGGBB",
        "BBGBBGBB",
        "BGBBBBBG",
        "GBBBBBBG"
    ], 5),
    coin: createSprite([
        "__yyyy__",
        "_yyyyyy_",
        "yy_yy_yy",
        "yy_yy_yy",
        "yy_yy_yy",
        "_yyyyyy_",
        "__yyyy__"
    ], 3),
    mushroom: createSprite([
        "___rrrr___",
        "__rrrrrr__",
        "_rrwrrwrr_",
        "_rrwrrwrr_",
        "__rrrrrr__",
        "___sss___",
        "__sksks__",
        "__sssss__"
    ], 3),
    star: createSprite([
        "____y____",
        "___yyy___",
        "__yyyyy__",
        "yyyyyyyyy",
        "_yyyyyyy_",
        "__yyyyy__",
        "__y___y__",
        "_y_____y_"
    ], 3),
    fireball: createSprite([
        "__rr__",
        "_ryyr_",
        "ryyyrr",
        "ryyyrr",
        "_ryyr_",
        "__rr__"
    ], 3),
    cloud: createSprite([
        "_____ww_____",
        "____wwww____",
        "___wwwwww___",
        "__wwwwwwww__",
        "_wwwwwwwwww_",
        "wwwwwwwwwwww"
    ], 5), // Simple cloud shape
    bird: createSprite([
        "__k___k__",
        "_k_k_k_k_",
        "k__k_k__k",
        "k__kkk__k",
        "_k_____k_",
        "__kkkkk__"
    ], 3)
};
