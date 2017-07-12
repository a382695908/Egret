module fighter {
	/**
	 *  主游戏容器
	 */
	export class GameContainer extends egret.DisplayObjectContainer {
		//开始按钮
		private btnStart: egret.Bitmap
		//舞台宽高
		private stageW: number
		private stageH: number
		//可滚动背景图
		private bg: fighter.BgMap
		//我的飞机
		private myFighter: fighter.Airplane
		//我的子弹
		private myBullets: fighter.Bullet[] = []
		//敌人的飞机
		private enemyFighters: fighter.Airplane[] = []
		//触发创建敌机的时间间隔
		private enemyFightersTimer: egret.Timer = new egret.Timer(1000)
		//敌人的子弹
		private enemyBullets: fighter.Bullet[] = []
		//成绩显示
		private scorePanel:fighter.ScorePanel
		//我的成绩
		private myScore:number = 0
		//时间
		private __lastTime: number


		public constructor() {
			super()
			this.addEventListener(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this)
		}

		/**
		 * 初始化
		 */
		private onAddToStage(event: egret.Event) {
			this.removeEventListener(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this)
			this.createGameScene()
		}

		/**
		 * 创建游戏场景
		 */
		private createGameScene(): void {
			this.stageW = this.stage.stageWidth
			this.stageH = this.stage.stageHeight

			//创建可滚动的背景图
			this.bg = new fighter.BgMap()
			this.addChild(this.bg) 

			//开始按钮
			this.btnStart = fighter.createBitmapByName('btnStart')
			this.btnStart.x = (this.stageW - this.btnStart.width) / 2
			this.btnStart.y = (this.stageH - this.btnStart.height) / 2
			this.btnStart.touchEnabled = true
			this.btnStart.addEventListener(egret.TouchEvent.TOUCH_TAP, this.gameStart, this)
			this.addChild(this.btnStart)

			//我的飞机
			this.myFighter = new fighter.Airplane(RES.getRes('f1'), 100)
			this.myFighter.y = this.stageH - this.myFighter.height - 50
			this.addChild(this.myFighter)

			this.scorePanel = new fighter.ScorePanel()
			//预创建
            this.preCreatedInstance();
		}
		/**预创建一些对象，减少游戏时的创建消耗*/
		private preCreatedInstance(): void {
			var i: number = 0;
			var objArr: any[] = [];
			for (i = 0; i < 20; i++) {
				var bullet = fighter.Bullet.produce("b1");
				objArr.push(bullet);
			}
			for (i = 0; i < 20; i++) {
				bullet = objArr.pop();
				fighter.Bullet.reclaim(bullet, "b1");
			}
			for (i = 0; i < 20; i++) {
				var bullet = fighter.Bullet.produce("b2");
				objArr.push(bullet);
			}
			for (i = 0; i < 20; i++) {
				bullet = objArr.pop();
				fighter.Bullet.reclaim(bullet, "b2");
			}
			for (i = 0; i < 20; i++) {
				var enemyFighter: fighter.Airplane = fighter.Airplane.produce("f2", 1000);
				objArr.push(enemyFighter);
			}
			for (i = 0; i < 20; i++) {
				enemyFighter = objArr.pop();
				fighter.Airplane.reclaim(enemyFighter, "f2");
			}
		}
		/**
		 * 游戏开始
		 */
		private gameStart(): void {
			this.myScore = 0
			this.removeChild(this.btnStart)
			this.bg.start()
			this.touchEnabled = true
			this.addEventListener(egret.Event.ENTER_FRAME, this.gameViewUpdate, this)
			//监听触摸事件
			this.addEventListener(egret.TouchEvent.TOUCH_MOVE, this.touchHandler, this)
			this.myFighter.x = (this.stageW-this.myFighter.width)/2;
			//开火
            this.myFighter.fire()
            this.myFighter.blood = 10
			//子弹的创建是由监听‘createBullet’ 事件驱动的，为我的飞机和敌机添加事件
			this.myFighter.addEventListener('createBullet', this.createBulletHandler, this)

			this.enemyFightersTimer.addEventListener(egret.TimerEvent.TIMER, this.createEnemyFighter, this)
			this.enemyFightersTimer.start()

            if(this.scorePanel.parent == this)
                this.removeChild(this.scorePanel)
		}

		/**
		 * 创建敌机
		 */
		private createEnemyFighter(evt: egret.TimerEvent): void {
			var enemyFighter: fighter.Airplane = fighter.Airplane.produce('f2', 1000)
			//随机生成坐标
			enemyFighter.x = Math.random() * (this.stageW - enemyFighter.width)
			enemyFighter.y = -enemyFighter.height - Math.random() * 300
			enemyFighter.addEventListener('createBullet', this.createBulletHandler, this)
			enemyFighter.fire()
			this.addChildAt(enemyFighter, this.numChildren - 1)
			this.enemyFighters.push(enemyFighter)
		}
   
		/**
		 * 创建子弹处理函数
		 */
		private createBulletHandler(evt: egret.Event): void {
			var bullet: fighter.Bullet
			if (evt.target == this.myFighter) {
				for (var i: number = 0; i < 2; i++) {
					bullet = fighter.Bullet.produce('b1')
					bullet.x = i == 0 ? (this.myFighter.x + 10) : (this.myFighter.x + this.myFighter.width - 22)
					bullet.y = this.myFighter.y + 30
					this.addChildAt(bullet, this.numChildren - 1 - this.enemyFighters.length)
					this.myBullets.push(bullet)
				}
			} else {
				var theFighter: fighter.Airplane = evt.target
				bullet = fighter.Bullet.produce('b2')
				bullet.x = theFighter.x + 28
				bullet.y = theFighter.y + 10
				this.addChildAt(bullet, this.numChildren - 1 - this.enemyFighters.length)
				this.enemyBullets.push(bullet)
			}
		}

		/**
		 * 游戏画面更新
		 */
		private gameViewUpdate(evt: egret.Event): void {
			//为了防止FPS下降造成回收慢，生成快，进而导致DRAW数量失控，需要计算一个系数，当FPS下降的时候，让运动速度加快
			var nowTime: number = egret.getTimer()
			var fps: number = 1000 / (nowTime - this.__lastTime)
			this.__lastTime = nowTime
			var speedOffset: number = 60 / fps

			//我的子弹运动
			var i: number = 0
			var bullet: fighter.Bullet
			var myBulletsCount: number = this.myBullets.length
			for (; i < myBulletsCount; i++) {
				bullet = this.myBullets[i]
				if (bullet.y < -bullet.height){
					this.removeChild(bullet)
					fighter.Bullet.reclaim(bullet,'b1')
					this.myBullets.splice(i,1)
					i--
					myBulletsCount--
				}
				bullet.y -= 12 * speedOffset
			}
			//敌人飞机运动
			var theFighter: fighter.Airplane
			var enemyFighterCount: number = this.enemyFighters.length
			for (i = 0; i < enemyFighterCount; i++) {
				theFighter = this.enemyFighters[i]
				if (theFighter.y > this.stage.stageHeight) {
					this.removeChild(theFighter)
					fighter.Airplane.reclaim(theFighter, 'f2')
					//theFighter.removeEventListener("createBullet",this.createEnemyBulletHandler,this)
					theFighter.stopFire()
					this.enemyFighters.splice(i, 1)
					i--
					enemyFighterCount--
				}
				theFighter.y += 4 * speedOffset
			}
			//敌人子弹运动
			var enemyBulletsCount: number = this.enemyBullets.length
			for (i = 0; i < enemyBulletsCount; i++) {
				bullet = this.enemyBullets[i]
				if (bullet.y > this.stageH) {
					this.removeChild(bullet)
					Bullet.reclaim(bullet,'b2')
					this.enemyBullets.splice(i,1)
					i--
					enemyBulletsCount--
				}
				bullet.y += 8 * speedOffset
			}
			this.gameHitTest();
		}

		/**
		 * 响应飞机触摸事件
		 */
		private touchHandler(evt: egret.TouchEvent): void {
			if (evt.type == egret.TouchEvent.TOUCH_MOVE) {
                var tx:number = evt.localX
				tx = Math.max(0,tx)
				tx = Math.min(this.stageW-this.myFighter.width,tx)
                this.myFighter.x = tx
			}
		}

		/**
		 * 游戏碰撞检测
		 */
		private gameHitTest(): void {
			var i: number, j: number
			var bullet: fighter.Bullet
			var theFighter: fighter.Airplane
			//子弹数量
			var myBulletsCount: number = this.myBullets.length
			//敌机飞机数量
			var enemyFighterCount: number = this.enemyFighters.length
			//敌机子弹数量
			var enemyBulletsCount: number = this.enemyBullets.length
			//将需要消失的子弹和飞机记录
			var delBullets: fighter.Bullet[] = []
			var delFighters: fighter.Airplane[] = []
			//我的子弹可以消灭敌机
			for (i = 0; i < myBulletsCount; i++) {
				bullet = this.myBullets[i]
				for (j = 0; j < enemyFighterCount; j++) {
					theFighter = this.enemyFighters[j]
					if (fighter.GameUtil.hitTest(theFighter, bullet)) {
						theFighter.blood -= 2
						if (delBullets.indexOf(bullet) == -1)
							delBullets.push(bullet)
						if (theFighter.blood <= 0 && delFighters.indexOf(theFighter) == -1) {
							delFighters.push(theFighter)
						}
					}
				}
			}

			//敌人的子弹可以减少我的飞机血量
			for (i = 0; i < enemyBulletsCount; i++) {
				bullet = this.enemyBullets[i]
				if (fighter.GameUtil.hitTest(this.myFighter, bullet)) {
					this.myFighter.blood -= 1
					if (delBullets.indexOf(bullet) == -1) {
						delBullets.push(bullet)
					}
				}
			}

			//敌机的撞击可以消灭我
			for (i = 0; i < enemyFighterCount; i++) {
				theFighter = this.enemyFighters[i]
				if (fighter.GameUtil.hitTest(this.myFighter, theFighter)) {
					this.myFighter.blood -= 10
				}
			}
			if (this.myFighter.blood <= 0) {
				this.gameStop()
			} else {
				while (delBullets.length > 0) {
					bullet = delBullets.pop()
					this.removeChild(bullet)
					if (bullet.textureName == 'b1')
						this.myBullets.splice(this.myBullets.indexOf(bullet), 1)
					else
						this.enemyBullets.splice(this.enemyBullets.indexOf(bullet), 1)
					fighter.Bullet.reclaim(bullet, bullet.textureName)
				}
				this.myScore += delFighters.length
				while (delFighters.length > 0) {
					theFighter = delFighters.pop()
					theFighter.stopFire()
					theFighter.removeEventListener('createBullet', this.createBulletHandler, this)
					this.removeChild(theFighter)
					this.enemyFighters.splice(this.enemyFighters.indexOf(theFighter),1)
					fighter.Airplane.reclaim(theFighter, 'f2')
				}
			}


		}

		/**
		 * 在游戏停止方法中，结束游戏
		 */
		private gameStop():void {
			this.addChild(this.btnStart)
			this.bg.pause()
			this.removeEventListener(egret.Event.ENTER_FRAME, this.gameViewUpdate, this)
			this.removeEventListener(egret.TouchEvent.TOUCH_MOVE, this.touchHandler, this)
			this.myFighter.stopFire()
			this.myFighter.removeEventListener('createBullet', this.createBulletHandler, this)
			this.enemyFightersTimer.removeEventListener(egret.TimerEvent.TIMER, this.createEnemyFighter, this)

			this.enemyFightersTimer.stop()

			//清理子弹
			var i:number = 0
			var bullet:fighter.Bullet
			while(this.myBullets.length > 0) {
				bullet = this.myBullets.pop()
				this.removeChild(bullet)
				fighter.Bullet.reclaim(bullet, 'b1')
			}
			while(this.enemyBullets.length > 0) {
				bullet = this.enemyBullets.pop()
				this.removeChild(bullet)
				fighter.Bullet.reclaim(bullet, 'b2')
			}

			//清理飞机
			var theFighter: fighter.Airplane
			while(this.enemyFighters.length > 0) {
				theFighter = this.enemyFighters.pop()
				theFighter.stopFire()
				theFighter.removeEventListener('createBullet', this.createBulletHandler, this)
				this.removeChild(theFighter)
				fighter.Airplane.reclaim(theFighter, 'f2')
			}

			//显示成绩
			this.scorePanel.showScore(this.myScore)
			this.scorePanel.x = (this.stageW - this.scorePanel.width) / 2
			this.scorePanel.y = 100
			this.addChild(this.scorePanel)
		}
	}
}