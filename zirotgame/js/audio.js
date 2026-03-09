window.Sounds = {
    path: 'assets/sounds/',
    _play(file) {
        const audio = new Audio(`${this.path}${file}.mp3`);
        audio.volume = 0.4;
        audio.play().catch(() => {}); 
    },
    click() { this._play('click'); },
    correct() { this._play('correct'); },
    wrong() { this._play('wrong'); },
    tick() { this._play('tick'); },
    gameOver() { this._play('gameover'); }
};
