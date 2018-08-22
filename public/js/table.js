'use strict';

//codes of errors
const OK = 0;

//syntax errors 1**
const WRONG_SYNTAX = 100;
const WRONG_SYMBOL = 101;
const BAD_NUMBER = 102;
const UNKNOWN_IDENTIFIER = 103;
const EXPECTED_OPERATOR = 104;
const EXPECTED_IDENTIFIER = 105;
const EXPECTED_EXACT = 106;
const EXPECTED_CELL = 107;

//formula args errors 2**
const ARG_ERROR = 200;
const DIV_BY_ZERO = 201;
const UNDEFINED_ARG = 202;
const WRONG_ARGS_AMOUNT = 203;

//service errors 3**
const SERVICE_ERR = 300;
const UNDEFINED = 301;
const NAN = 302;
const NOT_A_FORMULA = 303;

//dependency errors 4**
const DEPEND_ERR = 400;
const CIRC_DEPEND_ERR = 401;

//colour consts)))
const WHITE = 0;
const GREY = 1;
const BLACK = 2;

class Stack {
    constructor() {
        this.stack = new Array();
    }

    isEmpty() {
        return this.stack.length === 0;
    }

    push(x) {
        this.stack.push(x);
    }

    pop() {
        if (this.isEmpty()) throw 'stack undeflow'
        return this.stack.pop();
    }

    top() {
        if (this.isEmpty()) throw 'stack undeflow'
        return this.stack[this.stack.length - 1];
    }

    clear() {
        this.stack.length = 0;
    }
}

const NONE = 0;
const PUSH = 1;
const POP = 2;

class ActionStack {
    constructor(cap) {
        this.stack = new Array(cap + 1);
        this.curPos = 0;
        this.lastPush = 0;
        this.lim = 0;
    }

    do(x) {
        console.log('do', 'curPos:', this.curPos, 'lastPush:', this.lastPush, 'lim', this.lim);
        this.stack[this.curPos] = x;
        this.curPos = (this.curPos + 1) % this.stack.length;
        this.lastPush = this.curPos;
        if (this.lim === this.curPos) {
            this.lim = (this.lim + 1) % this.stack.length;
        }
    }

    undo() {
        console.log('undo', 'curPos:', this.curPos, 'lastPush:', this.lastPush, 'lim', this.lim);
        if (this.curPos === this.lim) {
            return false;
        } else {
            this.curPos = (this.curPos + this.stack.length - 1) % this.stack.length;
            return this.stack[this.curPos];
        }
    }

    redo() {
        console.log('redo', 'curPos:', this.curPos, 'lastPush:', this.lastPush, 'lim', this.lim);
        if (this.curPos === this.lastPush) {
            return false;
        } else {
            let res = this.stack[this.curPos]
            this.curPos = (this.curPos + 1) % this.stack.length;
            return res;
        }
    }
}

class FormulaError {
    constructor(error, msg, char_pos = -1, prev = null) {
        this.error = error;
        this.msg = msg;
        this.char_pos = char_pos;
        this.prev = prev;
    }

    getTrace() {
        let trace = "";
        for (let cur = this; cur != null; cur = cur.prev) {
            trace += this.error + " " + this.msg + "\n";
        }
        return trace;
    }
}

class Ceil {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.realText = '';
        this.toDisplay = '';
        this.error = null;
        this.colour = WHITE;
        this.dependencies = new Set();
        this.receivers = new Set();
        this.func = null;
        console.log("created ceil")
    }

    toString() {
        return this.toDisplay + ' \\' + this.realText + "\\"
    }

    get() {
        if (this.error != null) {
            throw this.error;
        } else {
            return this.toDisplay;
        }
    }

}



const coordFromLetters = (str) => {
    str = str.toUpperCase();
    let res = 0;
    let mul = 1;
    for (let i = str.length - 1; i >= 0; i--) {
        res += mul * (str.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        mul *= 26;
    }

    return res - 1;
}

const isAlphabetic = (str) => {
    return ('A'.charCodeAt(0) <= str.charCodeAt(0) && str.charCodeAt(0) <= 'Z'.charCodeAt(0) ||
        'a'.charCodeAt(0) <= str.charCodeAt(0) && str.charCodeAt(0) <= 'z'.charCodeAt(0)
    );
}

const isNumeric = (str) => {
    return ('0'.charCodeAt(0) <= str.charCodeAt(0) && str.charCodeAt(0) <= '9'.charCodeAt(0));
}

const isSpecial = (str) => {
    return ((str === '(') || (str === ')') ||
        (str === '+') || (str === '-') ||
        (str === '*') || (str === '/') ||
        (str === ';') || (str === ':'));
}

const isSpaceChar = (str) => {
    return (str.trim() === '');
}

const convCoord = (str) => {
    console.log(str)
    str = str.toUpperCase();
    let beg = 0;
    if (str[0] === "$") beg = 1;
    let end = beg;
    for (; end < str.length && isAlphabetic(str[end]); end++);
    if (beg === end) {
        throw "not a ceil";
    }
    let first = Number(coordFromLetters(str.substring(beg, end)));


    beg = end;
    if (str[beg] === "$") beg++;
    for (end = beg; end < str.length && isNumeric(str[end]); end++);
    if (beg === end || end != str.length || str[beg] === "0") {
        throw "not a ceil";
    }
    let second = Number(str.substring(beg, end)) - 1;


    return {
        x: first,
        y: second
    };
}

class Table {

    constructor(x, y, action_memo = 50) {
        this.activeCeils = {};
        this.field = new Array(x)
        for (let i = 0; i < x; i++) {
            this.field[i] = new Array(y)
            for (let j = 0; j < y; j++) {
                this.field[i][j] = new Ceil(i, j);
            }
        }
        console.log('ALL CREATED');
        this.toUpdate = new Stack();
        this.actions = new ActionStack(action_memo);
    }

    createCeilIfNeed(x, y) {
        if (this.field[x] == undefined) {
            this.field[x] = new Array(y + 1);
        }
        if (this.field[x][y] == undefined) {
            this.field[x][y] = new Ceil(x, y);
        }
    }

    setCeil(x, y, text, undo_or_redo = false) {
        this.createCeilIfNeed(x, y)
        if (text === this.field[x][y].realText) {
            return;
        }

        if (!undo_or_redo)
            this.actions.do({
                x: x,
                y: y,
                newText: text,
                oldText: this.field[x][y].realText
            });

        this.field[x][y].realText = text;
        if (this.field[x][y].realText) { //Обновляем в активных
            this.activeCeils[[x, y]] = str2arr(this.field[x][y].realText);
        } else {
            delete this.activeCeils[[x, y]];
        }

        if (text[0] !== '=') {
            this.field[x][y].toDisplay = text;
            this.field[x][y].error = null;
            this.field[x][y].func = null;
        } else {
            ceilInsert(this, this.field[x][y], text.substring(1, text.length));
        }
        this.toUpdate.push(this.field[x][y]);
    }

    getInnerCeil(x, y) {
        this.createCeilIfNeed(x, y);
        return this.field[x][y];
    }

    getCeil(x, y) {
        this.createCeilIfNeed(x, y)
        return {
            realText: this.field[x][y].realText,
            toDisplay: this.field[x][y].toDisplay,
            error: this.field[x][y].error
        }
    }

    update() {
        console.log(this.field[0][0].receivers)
        console.log(this.field[0][1].receivers)
        console.log(this.field[1][1].receivers)
        let rightOrderedUPD = new Stack();
        let depth_stack = new Stack();
        let usage_array = new Array();
        while (!this.toUpdate.isEmpty()) {


            if (this.toUpdate.top().colour !== WHITE) {
                this.toUpdate.pop();
                continue;
            }
            depth_stack.push(this.toUpdate.top());
            usage_array.push(this.toUpdate.top());
            this.toUpdate.pop();

            while (!depth_stack.isEmpty()) {
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!TRACKING UPDATE")
                if (depth_stack.top().colour === WHITE) {
                    depth_stack.top().colour = GREY;
                    console.log(depth_stack.top().x, depth_stack.top().y, 'not popped');
                    depth_stack.top().receivers.forEach(ceil => {
                        console.log(ceil.x, ceil.y, 'watching', ceil.colour);
                        if (ceil.colour === WHITE) {
                            depth_stack.push(ceil);
                            usage_array.push(ceil);
                        }
                    })
                } else {
                    console.log(depth_stack.top().x, depth_stack.top().y, 'popped');
                    depth_stack.top().colour = BLACK;
                    rightOrderedUPD.push(depth_stack.pop());
                }
            }

        }

        usage_array.forEach(x => {
            x.colour = WHITE;
        })

        let res = new Array();

        while (!rightOrderedUPD.isEmpty()) {
            let curCeil = rightOrderedUPD.pop();
            if (curCeil.func != null && (curCeil.error === null || curCeil.error.prev !== null)) {
                try {
                    curCeil.error = null;
                    curCeil.toDisplay = String(curCeil.func());
                } catch (e) {
                    curCeil.error = new FormulaError(
                        ARG_ERROR,
                        'some error in args', -1,
                        e);
                    curCeil.toDisplay = curCeil.error.msg;
                }
            } else if (curCeil.error !== null) {
                curCeil.toDisplay = curCeil.error.msg;
            }

            res.push({
                x: curCeil.x,
                y: curCeil.y
            });
        }
        console.log('res:', res);
        return res;
    }

    undo() {
        let change = this.actions.undo();
        if (change) {
            this.setCeil(change.x, change.y, change.oldText, true);
        }
        return change;
    }

    redo() {
        let change = this.actions.redo();
        if (change) {
            this.setCeil(change.x, change.y, change.newText, true);
        }
        return change;
    }

}



const POSSIBLE_FUNCTIONS = new Set(["SUM", "MUL"]);

const OPERATOR = (first, oper, second) => { //TODO: bigNums
    if (oper === undefined && second === undefined) {
        return first;
    }

    if (isNaN(first)) {
        throw new FormulaError(
            NAN,
            first + ' is not a number'
        )
    }
    if (isNaN(second)) {
        throw new FormulaError(
            NAN,
            second + ' is not a number'
        )
    }
    switch (oper) {
        case '+':
            return -(-first - second);
        case '-':
            return +first - second;
        case '*':
            return +first * second;
        case '/':
            if (second == 0) {
                throw new FormulaError(
                    DIV_BY_ZERO,
                    second + " equals zero",
                );
            }
            return +first / second;
    }
}

const SUM = (...args) => {
    let sum = 0;
    for (let i = 0; i < args.length; i++) {
        sum = OPERATOR(sum, '+', args[i]);
    }
    return sum;
}

const MUL = (...args) => {
    let mul = 1;
    for (let i = 0; i < args.length; i++) {
        mul = OPERATOR(mul, '*', args[i]);
    }
    return mul;
}


const funcConstructor = (func, funcName, min_arg, max_arg) => {
    POSSIBLE_FUNCTIONS.add(funcName);
    return (...args) => {
        if (args.length < min_arg) {
            throw new FormulaError(
                WRONG_ARGS_AMOUNT,
                'expected more then ' + min_arg + ' arguments',
            );
        }

        if (max_arg !== undefined && args.length < max_arg) {
            throw new FormulaError(
                WRONG_ARGS_AMOUNT,
                'expected less then ' + max_arg + ' arguments',
            );
        }

        for (let arg in args) {
            if (isNaN(arg)) {
                throw new FormulaError(
                    NAN,
                    arg + ' is not a number'
                );
            }
        }

        let res = func(...args);
        if (isNaN(res)) {
            throw new FormulaError(
                UNDEFINED,
                funcName + ' result undefined',
            );
        }
        return res;
    }
}

const ABS = funcConstructor(Math.abs, 'ABS', 1, 1);

const POWER = funcConstructor(Math.pow, 'POWER', 2, 2);

const LOG = funcConstructor(Math.log, 'LOG', 1, 1);

const SQRT = funcConstructor(Math.sqrt, 'SQRT', 1, 1);

const KOPEH = funcConstructor(Math.sqrt, 'KOPEH', 1, 1);

const ROUND = funcConstructor(Math.round, 'ROUND', 1, 1);

const FLOOR = funcConstructor(Math.floor, 'FLOOR', 1, 1);

const COS = funcConstructor(Math.cos, 'COS', 1, 1);

const SIN = funcConstructor(Math.sin, 'SIN', 1, 1);

const ACOS = funcConstructor(Math.acos, 'ACOS', 1, 1);

const ASIN = funcConstructor(Math.asin, 'ASIN', 1, 1);

const EXP = funcConstructor(Math.exp, 'EXP', 1, 1);

const PI = funcConstructor(() => Math.PI, 'PI', 0, 0);

const MAX = funcConstructor(Math.max, 'MAX', 1);

const MIN = funcConstructor(Math.min, 'MIN', 1);

const SIGN = funcConstructor(Math.sign, 'SIGN', 1, 1);

const RAND = funcConstructor(Math.random, 'RAND', 1, 1);


const isCircDepend = (startCeil) => {
    let depth_stack = new Stack();
    let usage_array = new Array();
    let hasDependency = false;

    depth_stack.push(startCeil);
    usage_array.push(startCeil);
    startCeil.colour = GREY;

    while (!depth_stack.isEmpty()) {
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!TRACKING CIRCULAR")
        if (depth_stack.top().colour === BLACK) {
            depth_stack.pop();
        } else {
            depth_stack.top().colour = BLACK;
            if (depth_stack.top().receivers.has(startCeil)) {
                hasDependency = true;
                break;
            }
            depth_stack.top().receivers.forEach(ceil => {
                if (ceil.colour === WHITE) {
                    depth_stack.push(ceil);
                    usage_array.push(ceil);
                    ceil.colour = GREY;
                }
            })
        }
    }

    usage_array.forEach(x => {
        x.colour = WHITE;
    })

    return hasDependency;

}

const ceilInsert = (table, ceil, text) => {
    console.log('ceilInsert')
    ceil.dependencies.forEach(x => x.receivers.delete(ceil));
    ceil.dependencies.clear();
    ceil.error = null;
    let func;
    try {
        let tokens = tokenize(text);
        func = parseAndCreate(table, ceil, tokens);
    } catch (e) {
        ceil.dependencies.forEach(x => x.receivers.delete(ceil));
        ceil.dependencies.clear();
        ceil.error = e;
        return;
    }
    ceil.func = func;
    if (isCircDepend(ceil)) {
        ceil.dependencies.forEach(x => x.receivers.delete(ceil));
        ceil.dependencies.clear();
        ceil.error = new FormulaError(
            CIRC_DEPEND_ERR,
            'circular dependency detected', -2,
        )
        ceil.func = null;
    }
}

const tokenize = (formula) => {
    formula = formula.toUpperCase();
    let tokens = new Array();
    let positions = new Array();
    let ptL = 0;
    while (ptL < formula.length) {
        if (isSpaceChar(formula[ptL])) {
            ptL++;
        } else if (isSpecial(formula[ptL])) {
            tokens.push(formula[ptL]);
            positions.push(ptL);
            ptL++;
        } else if (isNumeric(formula[ptL])) {
            positions.push(ptL);
            let beg = ptL;
            let temp = '';
            while (ptL < formula.length && (isNumeric(formula[ptL]) || formula[ptL] == '.')) {
                temp += formula[ptL];
                ptL++;
            }

            if (isNaN(temp)) {
                throw new FormulaError(
                    BAD_NUMBER,
                    "bad number: " + temp,
                    beg,
                )
            }
            tokens.push(temp);
        } else if (isAlphabetic(formula[ptL]) || formula[ptL] == '$') {
            positions.push(ptL);
            let beg = ptL;
            let temp = '';
            while (ptL < formula.length && (isAlphabetic(formula[ptL]) || isNumeric(formula[ptL]) || formula[ptL] == '$')) {
                temp += formula[ptL];
                ptL++;
            }
            if (!POSSIBLE_FUNCTIONS.has(temp)) {
                try {
                    convCoord(temp);
                } catch (e) {
                    throw new FormulaError(
                        UNKNOWN_IDENTIFIER,
                        "bad identifier: " + temp,
                        beg,
                    )
                }
            }
            tokens.push(temp);
        } else {
            console.log("kek lol kek lol")
            throw new FormulaError(
                WRONG_SYMBOL,
                "wrong symb: " + formula[ptL],
                ptL
            );
        }
    }

    console.log("ALL OK");
    return new Tokens(tokens, positions);

}

class Tokens {
    constructor(tokens, positions) {
        this.tokens = tokens;
        this.positions = positions;
        this.cur = 0;
    }

    isEmpty() {
        return this.cur === this.tokens.length;
    }

    next() {
        if (this.isEmpty()) {
            throw new FormulaError(
                WRONG_SYNTAX,
                'cant parse',
            );
        }
        this.cur++;
        return {
            token: this.tokens[this.cur - 1],
            pos: this.positions[this.cur - 1]
        }
    }

    peek() {
        if (this.isEmpty()) {
            throw new FormulaError(
                WRONG_SYNTAX,
                'cant parse',
            );
        }
        return {
            token: this.tokens[this.cur],
            pos: this.positions[this.cur]
        }
    }

    clear() {
        this.cur = 0;
    }
}

//<E>  ::= <T> <E’>. 
//<E’> ::= + <T> <E’> | - <T> <E’> | . 
//<T>  ::= <F> <T’>. 
//<T’> ::= * <F> <T’> | / <F> <T’> | . 
//<F>  ::= <number> | <ceil> | ( <E> ) | - <F> | + <F> |  <func> ( <B> ).
//<B>  ::= <E> ; <B> | <E> | .  
//TODO: update scheme

const mustBe = (tokens, token) => {
    console.log("MUSTBE " + "empty: " + tokens.isEmpty())
    if (tokens.isEmpty()) {
        throw new FormulaError(
            EXPECTED_EXACT,
            'expected exact ' + token + ', but found nothing', -2
        );
    }
    if (tokens.peek().token != token) {
        throw new FormulaError(
            EXPECTED_EXACT,
            'expected exact ' + token + ', found: ' + tokens.peek().token,
            tokens.peek().pos
        );
    } else {
        tokens.next();
    }
}

const parseAndCreate = (table, ceil, tokens) => {
    console.log('parseAndCreate')
    let func = parseAddBeg(table, ceil, tokens);
    func = '(table) => { return (() => (' + func + '))}'; //"(d) => {return (() => pow2(d.x))}"
    console.log(func)

    return eval(func)(table);
}

const parseAddBeg = (table, ceil, tokens) => {
    console.log('parseAddBeg');
    return parseAddEnd(table, ceil, tokens, parseMulBeg(table, ceil, tokens));
}

const parseAddEnd = (table, ceil, tokens, funcStr) => {
    console.log('parseAddEnd' + ' ' + funcStr)
    if (!tokens.isEmpty()) {
        if (tokens.peek().token === '+' || tokens.peek().token === '-') {
            funcStr = 'OPERATOR(' + funcStr + ', \'' + tokens.next().token + '\', ';
            funcStr += parseMulBeg(table, ceil, tokens) + ')';
            return parseAddEnd(table, ceil, tokens, funcStr);
        } else if (tokens.peek().token === ')' || tokens.peek().token === ';' || tokens.peek().token === ':') {
            return funcStr;
        }
    } else {
        return funcStr;
    }

    throw new FormulaError(
        EXPECTED_OPERATOR,
        "expected operator, found: " + tokens.peek().token,
        tokens.peek().pos
    );



}

const parseMulBeg = (table, ceil, tokens) => {
    console.log('parseMulBeg')
    return parseMulEnd(table, ceil, tokens, parseElem(table, ceil, tokens));
}

const parseMulEnd = (table, ceil, tokens, funcStr) => {
    console.log('parseMulEnd' + ' ' + funcStr)
    if (!tokens.isEmpty()) {
        if (tokens.peek().token === '*' || tokens.peek().token === '/') {
            funcStr = 'OPERATOR(' + funcStr + ', \'' + tokens.next().token + '\', ';
            funcStr += parseElem(table, ceil, tokens) + ')';
            return parseMulEnd(table, ceil, tokens, funcStr);
        } else if (tokens.peek().token === ')' || tokens.peek().token === ';') {
            return funcStr;
        }
        return funcStr;
    } else {

        return funcStr;
    }


}

const parseElem = (table, ceil, tokens) => {
    console.log('parseElem' + ' ')
    let funcStr = '';
    if (!tokens.isEmpty()) {
        if (isNumeric(tokens.peek().token[0])) {
            console.log("OK : " + tokens.peek().token)
            return tokens.next().token;
        } else if (isAlphabetic(tokens.peek().token[0]) || tokens.peek().token[0] == '$') {
            if (POSSIBLE_FUNCTIONS.has(tokens.peek().token)) {
                funcStr += ' ' + tokens.next().token + '(';
                mustBe(tokens, '(')
                funcStr += parseArgs(table, ceil, tokens) + ')';
                mustBe(tokens, ')')
                return funcStr;
            }
            let x, y;
            try {
                let coord = convCoord(tokens.peek().token);
                x = coord.x;
                y = coord.y;
            } catch (e) {
                console.log(e)
                throw new FormulaError(
                    EXPECTED_IDENTIFIER,
                    "expected identifier, found: " + tokens.peek().token,
                    tokens.peek().pos
                );
            }

            ceil.dependencies.add(table.getInnerCeil(x, y));
            table.getInnerCeil(x, y).receivers.add(ceil);
            tokens.next();
            return funcStr + 'table.getInnerCeil(' + x + ',' + y + ').get()';

        } else if (tokens.peek().token === '(') {
            tokens.next();
            funcStr = '(' + parseAddBeg(table, ceil, tokens, funcStr) + ')';
            mustBe(tokens, ')');
            return funcStr;
        } else if (tokens.peek().token === '-' || tokens.peek().token === '+') {
            funcStr = tokens.next().token + parseElem(table, ceil, tokens, funcStr);
            return funcStr;
        }
    }

    throw new FormulaError(
        EXPECTED_IDENTIFIER,
        "expected identifier, found: " + tokens.peek().token,
        tokens.peek().pos
    );
}

const parseArgs = (table, ceil, tokens) => {
    console.log('parseArgs')
    let cur = '';
    let funcStr = '';
    let temp = '';
    let next1 = '';
    let next2 = '';
    if (tokens.peek().token === ')') {
        return funcStr;
    }
    while (!tokens.isEmpty()) {
        cur = tokens.peek().token;
        next1 = parseAddBeg(table, ceil, tokens)
        if (tokens.peek().token !== ':')
            funcStr += next1;
        else {
            tokens.next();
            temp = tokens.peek().token;
            next2 = parseAddBeg(table, ceil, tokens);

            try {
                if (next1.indexOf('()') !== next1.lastIndexOf('()') || next2.indexOf('()') !== next2.lastIndexOf('()'))
                    throw 'err';
                let firstCoord = convCoord(cur);
                let secondCoord = convCoord(temp);
                let s1 = Math.min(firstCoord.x, secondCoord.x);
                let s2 = Math.min(firstCoord.y, secondCoord.y);
                let f1 = Math.max(firstCoord.x, secondCoord.x);
                let f2 = Math.max(firstCoord.y, secondCoord.y);
                console.log('KKKEEEKKK', s1, s2, f1, f2);
                for (; s1 <= f1; s1++) {
                    for (let i = s2; i <= f2; i++) {
                        funcStr += 'table.getInnerCeil(' + s1 + ',' + i + ').get()';

                        ceil.dependencies.add(table.getInnerCeil(s1, i));
                        table.getInnerCeil(s1, i).receivers.add(ceil);
                        if (s1 != f1 || i != f2) {
                            funcStr += ',';
                        }
                    }
                }
            } catch (e) {
                console.log(e);
                console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                throw new FormulaError(
                    EXPECTED_CELL,
                    'expected: *cell*:*cell*, found: ' + next1 + ':' + next2,
                )
            }
        }
        if (tokens.peek().token === ')') {
            return funcStr;
        }
        funcStr += ', '
        mustBe(tokens, ';');
    }

    throw new FormulaError(
        EXPECTED_IDENTIFIER,
        "expected identifier, found: nothing", -1
    );

}


const mainDiv = document.getElementById('main-div');
const mainTable = document.getElementById('main-table');
const upTable = document.getElementById('up-table');
const leftTable = document.getElementById('left-table');
const upDiv = document.getElementById('up-div');
const leftDiv = document.getElementById('left-div');

let DEFAULT_ROWS = 50,
    DEFAULT_COLS = 25;
let ROWS = 0,
    COLS = 0;
let letters = [65];
let currentLet = [];
let focusID = '';
let innerTable = null;
let tableTitle = '';

const clear = (index) => {
    for (let i = index; i < letters.length; i++) {
        letters[i] = 65;
    }
}

const updateLetters = (index) => {
    if (letters[index] === 90) {
        if (index - 1 >= 0) {
            updateLetters(index - 1);
        } else {
            clear(0);
            letters.push(65);
        }
    } else {
        letters[index]++;
        if (index != letters.length - 1)
            clear(index + 1);
    }
}

const getXCoord = (elem) => elem.getBoundingClientRect().left + pageXOffset;
const getYCoord = (elem) => elem.getBoundingClientRect().top + pageYOffset;

const addExpansion = (letter, j) => {
    const newDiv = document.createElement('div');
    newDiv['id'] = letter;
    newDiv['className'] = 'modSymb';
    upTable.rows[0].cells[j].appendChild(newDiv);

    const movableLine = document.getElementById(letter);

    const changeParams = (element) => {
        const oldParams = {
            height: getComputedStyle(element).height,
            backgroundColor: getComputedStyle(element).backgroundColor,
            width: getComputedStyle(element).width,
        }

        element.style.height = getComputedStyle(mainTable).height;
        element.style.backgroundColor = '#808080';
        element.style.width = '2px';

        return oldParams;
    }

    movableLine.onmousedown = (e) => {
        const shiftX = e.pageX - getXCoord(movableLine);
        const params = changeParams(movableLine);
        let helpDiv;

        if (document.getElementById(letter + 'helper') === null) {
            helpDiv = document.createElement('div');
            helpDiv['id'] = letter + 'helper';
            helpDiv['className'] = 'modSymb';
            helpDiv.style.cursor = 'cell';
            mainTable.rows[0].cells[j].appendChild(helpDiv);
        } else {
            helpDiv = document.getElementById(letter + 'helper');
        }

        const params2 = changeParams(helpDiv);
        let coords = 'no move';

        const goExpansion = (delta1, delta2, padSize1, padSize2) => {
            document.getElementById(letter + '0').style.width = coords + delta1 + 'px';
            for (let i = 1; i <= ROWS; i++) {
                const flag = document.getElementById('Cell_' + i).isZeroPad;
                document.getElementById(letter + i).style.padding = (flag) ? '0px ' + padSize1 + 'px' : '2px ' + padSize1 + 'px';
                document.getElementById('Cell_' + letter + i).style.padding = (flag) ? '0px ' + padSize2 + 'px' : '1px ' + padSize2 + 'px';
                document.getElementById(letter + i).style.width = coords + delta2 + 'px';
            }
        }

        document.onmousemove = (e) => {
            const newLeft = e.pageX - shiftX - getXCoord(movableLine.parentNode);
            movableLine.style.left = (newLeft > 0) ? newLeft + 'px' : '0px';
            helpDiv.style.left = (newLeft > 0) ? newLeft + 'px' : '0px';
            coords = newLeft;
        }

        document.onmouseup = () => {
            if (coords != 'no move') {
                const mainCell = document.getElementById('Cell_' + letter);
                if (coords < 6) {
                    mainCell.style.padding = '0px';
                    mainCell.isZeroPad = true;
                    if (coords < 3) {
                        goExpansion(-coords, -coords, 0, 0);
                        movableLine.style.left = '-1px';
                        helpDiv.style.left = '-1px';
                        movableLine.style.cursor = 'col-resize';
                    } else {
                        movableLine.style.cursor = 'ew-resize';
                        goExpansion(0, 0, 0, 0);
                    }
                } else {
                    mainCell.style.padding = '1px 3px';
                    mainCell.isZeroPad = false;
                    movableLine.style.cursor = 'ew-resize';
                    goExpansion(-6, -6, 2, 3);
                }
            }

            movableLine.style.height = params.height;
            movableLine.style.width = params.width;
            movableLine.style.backgroundColor = params.backgroundColor;

            helpDiv.style.height = params2.height;
            helpDiv.style.width = params2.width;
            helpDiv.style.backgroundColor = params2.backgroundColor;

            document.onmousemove = document.onmouseup = null;
        }

        return false;
    }

    movableLine.ondragstart = () => false;
}

const addVerticalExpansion = (i) => {
    const newDiv = document.createElement('div');
    newDiv['id'] = (i + 1);
    newDiv['className'] = 'modVertSymb';
    leftTable.rows[i].cells[0].appendChild(newDiv);

    const movableLine = document.getElementById(i + 1);

    const changeParams = (element) => {
        const oldParams = {
            height: getComputedStyle(element).height,
            backgroundColor: getComputedStyle(element).backgroundColor,
            width: getComputedStyle(element).width,
        }

        element.style.height = '2px';
        element.style.backgroundColor = '#808080';
        element.style.width = getComputedStyle(mainTable).width;

        return oldParams;
    }

    movableLine.onmousedown = (e) => {
        const shiftY = e.pageY - getYCoord(movableLine);
        const params = changeParams(movableLine);
        let helpDiv;

        if (document.getElementById((i + 1) + 'helper') === null) {
            helpDiv = document.createElement('div');
            helpDiv['id'] = (i + 1) + 'helper';
            helpDiv['className'] = 'modVertSymb';
            helpDiv.style.cursor = 'cell';
            mainTable.rows[i].cells[0].appendChild(helpDiv);
        } else {
            helpDiv = document.getElementById((i + 1) + 'helper');
        }

        const params2 = changeParams(helpDiv);
        let coords = 'no move';

        const goExpansion = (delta1, delta2, padSize1, padSize2) => {
            document.getElementById('@' + (i + 1)).style.height = coords + delta1 + 'px';
            mainTable.rows[i].style['line-height'] = coords + delta2 + 'px';
            for (let j = 0; j <= COLS; j++) {
                const flag = document.getElementById('Cell_' + currentLet[j]).isZeroPad;
                document.getElementById(currentLet[j] + (i + 1)).style.padding =
                    (flag) ? padSize1 + 'px 0px' : padSize1 + 'px 2px';
                document.getElementById('Cell_' + currentLet[j] + (i + 1)).style.padding =
                    (flag) ? padSize2 + 'px 0px' : padSize2 + 'px 1px';
                document.getElementById(currentLet[j] + (i + 1)).style.height = coords + delta2 + 'px';
            }
        }

        document.onmousemove = (e) => {
            const newTop = e.pageY - shiftY - getYCoord(movableLine.parentNode);
            movableLine.style.top = (newTop > 0) ? newTop + 'px' : '0px';
            helpDiv.style.top = (newTop > 0) ? newTop + 'px' : '0px';
            coords = newTop;
        }

        document.onmouseup = () => {
            if (coords != 'no move') {
                const mainCell = document.getElementById('Cell_' + (i + 1));
                if (coords < 6) {
                    mainCell.style.padding = '0px';
                    mainCell.isZeroPad = true;
                    if (coords < 3) {
                        goExpansion(-coords, -coords, 0, 0);
                        movableLine.style.top = '-1px';
                        helpDiv.style.top = '-1px';
                        movableLine.style.cursor = 'row-resize';
                    } else {
                        movableLine.style.cursor = 'ns-resize';
                        goExpansion(0, -0.5, 0, 0);
                    }
                } else {
                    mainCell.style.padding = '1px 3px';
                    mainCell.isZeroPad = false;
                    movableLine.style.cursor = 'ns-resize';
                    goExpansion(-1, -5, 2, 3);
                }
            }

            movableLine.style.height = params.height;
            movableLine.style.width = params.width;
            movableLine.style.backgroundColor = params.backgroundColor;

            helpDiv.style.height = params2.height;
            helpDiv.style.width = params2.width;
            helpDiv.style.backgroundColor = params2.backgroundColor;

            document.onmousemove = document.onmouseup = null;
        }

        return false;
    }

    movableLine.ondragstart = () => false;
}

/**
 * Initialize cell events
 * @param {String} id
 */
const initCell = (columnNumber, rowNumber) => {
    const id = currentLet[columnNumber] + rowNumber;
    const newInput = document.getElementById(id);
    const newCell = document.getElementById('Cell_' + id);
    newInput.onkeydown = (e) => {
        let evtobj = window.event ? event : e
        if (evtobj.code === 'KeyZ' && evtobj.ctrlKey && evtobj.shiftKey) {
            console.log('REDO');
            evtobj.preventDefault();
        } else if (evtobj.code === 'KeyZ' && evtobj.ctrlKey) {
            console.log('UNDO');
            evtobj.preventDefault();
        }
    };
    newInput.addEventListener("keydown", function (elem) {
        return (event) => {
            console.log(newInput.id, 'code=', event.code, 'key=', event.key);
            if (event.key == 'Enter') {
                elem.blur();
            }
            if (event.key == 'Escape') {
                console.log(elem.value);
                elem.value = '';
            }
        }
    }(newInput))
    newInput.onfocus = function (elem) {
        return () => {
            console.log('onfocus')
            let coord = convCoord(elem.id)
            elem.value = innerTable.getCeil(coord.x, coord.y).realText;
        };
    }(newInput);
    newInput.onblur = function (elem) {
        return () => {
            console.log('onblur')
            let coord = convCoord(elem.id);
            innerTable.setCeil(coord.x, coord.y, elem.value);
            updateTables();
            elem.value = innerTable.getCeil(coord.x, coord.y).toDisplay;
        };
    }(newInput);
    newCell.onmousedown = (e) => { //please delete this brah 
        if (focusID) {
            const oldInput = document.getElementById(focusID);
            const oldCell = document.getElementById('Cell_' + focusID);

            oldInput.style.textAlign = 'right';
            oldCell.style.outline = '';
        }

        focusID = newInput.id;
        newInput.style.textAlign = 'left';
        newCell.style.outline = '3px solid #6bc961'
    }

    //При нажатии на Enter спускаемся вниз
    newInput.addEventListener('keydown', (e) => {
        let dx = 0;
        let dy = 0;

        if (e.key === 'Enter' || e.key === 'ArrowDown') { //Enter and down button
            dy = 1;
        } else if (e.key === 'ArrowUp') { //up
            dy = (rowNumber ? -1 : 0);
        } else if (e.key === 'ArrowLeft') { //left
            dx = (columnNumber ? -1 : 0);
        } else if (e.key === 'ArrowRight') { //right
            dx = 1;
        }

        const low_cell = document.getElementById('Cell_' + currentLet[columnNumber + dx] + (rowNumber + dy))
        const low_input = document.getElementById(currentLet[columnNumber + dx] + (rowNumber + dy))
        low_cell.dispatchEvent(new Event('mousedown', {
            keyCode: 13
        }));
        low_input.focus();
    });
}

const addCells = function (rows, cols) {

    if (rows === 0) {
        for (let i = COLS + 1; i <= COLS + cols; i++) {

            currentLet.push(String.fromCharCode.apply(null, letters));
            updateLetters(letters.length - 1);
            const letter = currentLet[currentLet.length - 1];

            const new_cell = upTable.rows[0].insertCell(-1);
            new_cell.innerHTML = `<div align = "center" id = "${letter + 0}" class = "up"> ${letter} </div>`;
            new_cell.id = 'Cell_' + letter;

            for (let j = 0; j < ROWS; j++) {

                const cell = mainTable.rows[j].insertCell(-1);
                cell.innerHTML = cell.innerHTML = "<textarea id = '" + letter + (j + 1) + "' class = 'cell_input_area'/>";
                cell.id = 'Cell_' + letter + (j + 1);
                initCell(currentLet.length - 1, j + 1);

                const inp = document.getElementById(letter + (j + 1));
                const preInp = document.getElementById(currentLet[currentLet.length - 2] + (j + 1));
                inp.style.height = preInp.style.height;
                inp.style.padding = preInp.style.padding;
                cell.style.padding = document.getElementById('Cell_' + currentLet[currentLet.length - 2] + (j + 1)).style.padding;
            }

            addExpansion(letter, i);
        }
    } else {

        if (ROWS === 0) {
            const row = upTable.insertRow(-1);

            for (let j = 0; j <= COLS + cols; j++) {

                currentLet.push(String.fromCharCode.apply(null, letters));
                updateLetters(letters.length - 1);
                const letter = currentLet[j];

                const new_cell = row.insertCell(-1);
                new_cell.innerHTML = `<div align = "center" id = "${letter + 0}" class = "up"> ${letter} </div>`;
                new_cell.id = 'Cell_' + letter;
                addExpansion(letter, j);
            }
        }

        for (let i = ROWS; i < ROWS + rows; i++) {
            const row = mainTable.insertRow(-1);
            const leftRow = leftTable.insertRow(-1);

            const left_cell = leftRow.insertCell(-1);
            left_cell.innerHTML = `<div align = "center" id = "${'@' + (i + 1)}" class = "left"> ${i+1} </div>`;
            left_cell.id = 'Cell_' + (i + 1);
            addVerticalExpansion(i);

            for (let j = 0; j <= COLS + cols; j++) {

                if (j > currentLet.length) {
                    currentLet.push(String.fromCharCode.apply(null, letters));
                    updateLetters(letters.length - 1);
                }
                const letter = currentLet[j];

                const new_cell = row.insertCell(-1);
                new_cell.innerHTML = "<textarea id = '" + letter + (i + 1) + "' class = 'cell_input_area'/>";
                new_cell.id = 'Cell_' + letter + (i + 1);
                initCell(j, i + 1);

                if (i >= DEFAULT_ROWS) {
                    const inp = document.getElementById(letter + (i + 1));
                    const preInp = document.getElementById(letter + i);
                    inp.style.width = preInp.style.width;
                    inp.style.padding = preInp.style.padding;
                    new_cell.style.padding = document.getElementById('Cell_' + letter + i).style.padding;
                }
            }
        }
    }

    ROWS += rows;
    COLS += cols;
}

mainDiv.onscroll = function () {
    upDiv.scrollLeft = this.scrollLeft;
    leftDiv.scrollTop = this.scrollTop;
    const moreCellsOnY = mainDiv.scrollHeight - mainDiv.clientHeight;
    const moreCellsOnX = mainDiv.scrollWidth - mainDiv.clientWidth;
    const percentY = (mainDiv.scrollTop / moreCellsOnY) * 100;
    const percentX = (mainDiv.scrollLeft / moreCellsOnX) * 100;
    if (percentY > 80) {
        addCells(5, 0);
    }
    if (percentX > 80) {
        addCells(0, 5);
    }
}


function colName(n) {
    let ordA = 'A'.charCodeAt(0);
    let ordZ = 'Z'.charCodeAt(0);
    let len = ordZ - ordA + 1;

    let s = "";
    while (n >= 0) {
        s = String.fromCharCode(n % len + ordA) + s;
        n = Math.floor(n / len) - 1;
    }
    return s;
}

const convNumtoId = (x, y) => {
    return colName(x) + String(y + 1);
}

const updateTables = () => {
    let upd = innerTable.update();

    console.log(upd);
    console.log('POKA OKEY')
    for (let i = 0; i < upd.length; i++) {
        let ceil = upd[i];
        console.log(ceil.x, ceil.y);
        console.log(innerTable.getCeil(ceil.x, ceil.y).toDisplay);
        console.log(innerTable.getCeil(ceil.x, ceil.y).realText);
        console.log(innerTable.getCeil(ceil.x, ceil.y).error);
        document.getElementById(convNumtoId(ceil.x, ceil.y)).value = innerTable.getCeil(ceil.x, ceil.y).toDisplay;
    }
}

/**
 * Удаляет таблицу, вместе с отображением
 */
const removeTable = () => {
    ROWS = COLS = 0;
    letters = [65];
    currentLet = [];
    mainTable.innerHTML = upTable.innerHTML = leftTable.innerHTML = '';
    document.getElementsByClassName('null-div')[0].innerHTML = '';
}

/**
 * Создаёт в памяти таблицу rows x cols + её отображение
 * @param {Number} rows 
 * @param {Number} cols 
 */
const createTable = (rows, cols) => {
    document.getElementsByClassName('null-div')[0].innerHTML = `<table><tr><td></td></tr></table>`;
    innerTable = new Table(cols, rows);
    addCells(rows, cols);
}

/**
 * Восстанавливает таблицу(+отображение) из JSON объекта,
 * Размер задаётся свойством size : [rows, cols]
 * Ячейки записываются в формате [x, y] : [<массив кодов символов>]
 * @param {Object} tableData 
 */
const tableFromObject = (tableData) => {
    document.getElementsByClassName('null-div')[0].innerHTML = `<table><tr><td></td></tr></table>`;
    innerTable = new Table(tableData['size'][0], tableData['size'][1]);
    addCells(tableData['size'][0], tableData['size'][1]);
    delete tableData['size'];
    for (let coordStr in tableData) {
        const coord = coordStr.split(',').map(e => parseInt(e, 10));
        innerTable.setCeil(coord[0], coord[1], arr2str(tableData[coordStr]));
    }

    updateTables();
}

/**
 * Загружает таблицу
 * @param {String} title 
 * @param {Function} okCallback 
 * @param {Function} errCallback 
 */
const getSavedTable = (title, okCallback, errorCallback) => {
    let adress = title ? '/load_user_data?status=' + USER_STATUS.USER + '&title=' + title :
        '/load_user_data?status=' + USER_STATUS.GUEST;

    sendXMLHttpRequest(config.host_main, config.port_main, adress, 'GET', null,
        (dataJSON, error) => {
            if (dataJSON.error || error) {
                return errorCallback(error ? error : dataJSON.error);
            }

            okCallback(dataJSON);
        });
}

/**
 * Загрузка таблицы при открытии страницы
 */
const loadTable = () => {
    sendXMLHttpRequest(config.host_main, config.port_main, '/start', 'GET', null,
        (data, error) => {
            if (data.error === ERRORS.AUTH_SERVER_ERROR || error) {
                console.log(ERROR_MESSAGES[error ? error : data.error])

                document.getElementById('userINFO').textContent = ERROR_MESSAGES[error ? error : data.error];
                createTable(DEFAULT_ROWS, DEFAULT_COLS);
                alert('Данные не будут сохраняться');
                return;
            }

            if (data.status === 'new_guest') {
                document.getElementById('userINFO').textContent = 'GUEST';
                document.getElementById('log').innerHTML = '<a href="/authentication">Войти</a>';
                createTable(DEFAULT_ROWS, DEFAULT_COLS);
            } else if (data.status === 'user') {
                document.getElementById('userINFO').textContent = data.email;
                document.getElementById('log').innerHTML = '<a href="/logout">Выйти</a>';

                const newButton = document.createElement('button');
                newButton.onclick = () => new_table(0,
                    () => {
                        removeTable();
                        createTable(DEFAULT_ROWS, DEFAULT_COLS);
                    },
                    (error) => {
                        alert(`Error: ${ERROR_MESSAGES[error]}. Retry later.`);
                        console.log(ERROR_MESSAGES[error]);
                    });
                newButton.innerText = 'New';
                document.getElementById('titles').appendChild(newButton);

                if (!data.error) {
                    data.titles.forEach((title) => {
                        const button = document.createElement('button');
                        button.onclick = () => getSavedTable(title, (dataINFO) => {
                                ajax_remove_guest(() => {
                                    removeTable();

                                    const tableData = JSON.parse(dataINFO.data);
                                    tableFromObject(tableData);
                                    tableTitle = title;
                                }, (error) => {
                                    alert(`Error: ${ERROR_MESSAGES[error]}. Retry later.`);
                                    console.log(ERROR_MESSAGES[error]);
                                });
                            },
                            (error) => {
                                alert(`Error: ${ERROR_MESSAGES[error]}. Retry later.`);
                                console.log(ERROR_MESSAGES[error]);
                            });
                        button.innerText = title;
                        document.getElementById('titles').appendChild(button);
                    })
                } else {
                    alert(`Error: ${ERROR_MESSAGES[data.error]}. Retry later.`);
                    console.log(ERROR_MESSAGES[data.error]);
                }

                getSavedTable(null, (dataINFO) => {
                    const tableData = JSON.parse(dataINFO.data);
                    tableFromObject(tableData);
                    const newButton = document.createElement('button');
                    newButton.onclick = () => stay(0, null,
                        (error) => {
                            alert(`Error: ${ERROR_MESSAGES[error]}. Retry later.`);
                            console.log(ERROR_MESSAGES[error]);
                        });
                    newButton.innerText = 'Stay';
                    document.getElementById('titles').appendChild(newButton);
                }, () => {
                    console.log('No guest saves');
                });

                //заблокировать таблицу
            } else if (data.status === 'guest') {
                document.getElementById('userINFO').textContent = 'GUEST';
                document.getElementById('log').innerHTML = '<a href="/authentication">Войти</a>';
                getSavedTable(null, (dataINFO) => {
                    const tableData = JSON.parse(dataINFO.data);
                    tableFromObject(tableData);
                }, () => {
                    createTable(DEFAULT_ROWS, DEFAULT_COLS)
                });
            }
        },
        () => {
            createTable(DEFAULT_ROWS, DEFAULT_COLS);
        }
    );
}

//Сохраняем перед закрытием
window.onbeforeunload = function () {
    const cookie = parseCookies(document.cookie);
    navigator.sendBeacon('http://' + config.host_main + ':' + config.port_main + '/save_user_data',
        'status=' + cookie['status'] + '&title=' + tableTitle + '&session=' + cookie['token'] +
        '&data=' + JSON.stringify(Object.assign({}, {
            'size': [ROWS, COLS]
        }, innerTable.activeCeils)));
}

document.onkeydown = (e) => {
    let evtobj = window.event ? event : e
    if (evtobj.code === 'KeyZ' && evtobj.ctrlKey && evtobj.shiftKey) {
        console.log('REDO');
        innerTable.redo();
        updateTables();
    } else if (evtobj.code === 'KeyZ' && evtobj.ctrlKey) {
        console.log('UNDO');
        innerTable.undo();
        updateTables();
    }
};

loadTable();