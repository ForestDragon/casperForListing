//***********************************************//
//構成:最初に変数と関数を定義し、その後キャスパー本体を実行//
//***********************************************//

///////////////////
//定数・変数定義
//
var casper = require('casper').create({
    verbose: true,
    logLevel: 'debug',
    wait_exit: 10000
});

//外部モジュールインポート（ここではjsonファイル）
var json = require('loginAccount.json');
require('utils').dump(json);

//変数定義
var LOGIN_URL         = '[URL]';
var DETAIL_URL        = '[URL]';
var LOADTIME          = 3000;  //ページロードに必要な時間。
var HECATE_ID         = json.legato.id;
var HECATE_PASS       = json.legato.pass;
var TOTAL_CLIENTS_NUM = 0;
var clientNum         = 0;
var clientName        = '';

//明細書期間指定用変数
var Term = function(){
    this.today = new Date();
    this.month = this.today.getMonth() + 1;     //month = 1~12
    this.year  = this.today.getFullYear();      //yyyy
    this.endYM = this.year * 100 + this.month;  //yyyymm
    this.startYM;                               //yyyymm
    this._init();
    return this;
}

Term.prototype = {
    _init: function(){
        this.url     = this.setURL();
        this.dirName = this.setDirName();
    },
    setURL: function(){
        var m       = this.month;
        var y       = this.year;
        var startYM = this.startYM;
        var endYM   = this.endYM;

        if(m === 1){
            //１月（年をまたいだ月）の月次明細の期間を「去年の12月~今年の１月」にするために必要な操作
            startYM = (y - 1) * 100 + 12;
        }else{
            startYM = y * 100 + m - 1;
        }

        return '?startMonth=' + startYM + '&endMonth' + endYM + '&results=100';
    },
    setDirName: function(){
        return this.month + '/' + HECATE_ID;
    }
}
//インスタンス化
Term = new Term();

///////////////////
//関数定義
//

//ログイン
function logIn(){
    this.evaluate(function(ACCOUNT,PASS){
        document.querySelector('#user_name').value = ACCOUNT;
        document.querySelector('#password').value  = PASS;
        document.querySelector('.yjBtnViewLogin').click();
    }, HECATE_ID, HECATE_PASS);
}

//スポンサードサーチページ移動
function sponsorOpen(){
    this.click('a[sl="SML15_ViewSelectAccountBtn"]');
}

//アカウント数取得
function getClientSum(){
    this.waitUntilVisible('#SelectAccountPanel .printlist', function(){
        TOTAL_CLIENTS_NUM = this.evaluate(function(){
            return document.getElementsByClassName('printlist')[0].getElementsByTagName('li').length;
        });

        if (!TOTAL_CLIENTS_NUM) {
            _exit('TOTAL_CLIENTS_NUM');
        }

    });
}

//アカウントページ移動
function clientOpen(){
    this.waitUntilVisible('#SelectAccountPanel .printlist', function(){
        this.click('a[sl="account_AccountName_' + clientNum +'"]');
    });
}

//タイムアウトした際
function _exit(selector){
    casper.echo("Oops!!=====================================================" + selector + " not found!!!!!").exit();
}

//明細ページ移動
function selectTerm(){
    this.wait(LOADTIME, function(){
        this.thenOpen(DETAIL_URL + Term.url);
    });
}

//アカウント名取得
function getClientName(){
    clientName = this.evaluate(function(){
        return document.getElementsByClassName('target')[0].textContent.split(/：/)[0].replace(/^（/g, '').replace(/／|\//g, '_');
    });
    if (!clientName) {
        _exit('clientName');
    }
}

//明細書キャプチャ
function capTransDesc(){
    this.capture('captureFile/' + Term.dirName + '/' + (clientNum + 1) + '_' + clientName + '.jpg');
}

//関数まとめ(クライアントページopenから明細書キャプチャまで)
function init(){
    this.then(clientOpen).then(selectTerm).then(getClientName).then(capTransDesc);
}

//ループ。
//init()をクライアントの数だけ回す。
//１回目の処理で、全アカウント数を取得。その後、明細書キャプチャ。２回目以降はアカウント数取得は不要なので、その処理を抜いて明細書キャプチャ。
//全アカウント数までループが回ったら、ループを抜けて終了。
function looper(){
    this.then(sponsorOpen);

    if (!TOTAL_CLIENTS_NUM) {
        this.then(getClientSum);
    } else if (clientNum < TOTAL_CLIENTS_NUM - 1) {
            clientNum++;
    } else {
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++looper successfully ended!!!+++++++++++++++++++++++++++++++++++++++++++++++');
        this.echo('==========================================================================================================================Done.').exit();
    }

    this.then(init).then(looper);
}

////////////////////////////////
//ここからキャスパー本体の実行
//
casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36');
casper.start(LOGIN_URL);

//ログイン
casper.then(logIn);

//linkOpen()からcapTransDesc()まで実行
casper.thenOpen(DETAIL_URL, looper);

casper.run();
