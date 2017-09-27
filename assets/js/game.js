/* eslint-env jquery */
var be = {}
be.questions = [{
  question: 'Who?',
  correctAnswer: 'me',
  incorrectAnswers: ['you', 'them', 'us']
},
{
  question: 'boo',
  correctAnswer: 'ya',
  incorrectAnswers: ['hoo', 'doo', 'boo']
}]

//start sequence
$.when($.ready).then(function () {
  game.render()
  game.questions = questionHandler.unansweredQuestions
  be.questions.forEach(i => questionHandler.addQuestion(i))
  $('.alert, #answerStats, #skipButton').hide()

  $('#questionOptions').on('click', 'li', function () {
    if (!game.question.isAnswered()) {
      var index = $(this).data('index')
      game.question.selectAnswer(index)
      timer.stop()
      game.tick()
    }
  })
  $('#skipButton').on('click', function () {
    game.nextQuestion().render()
  })
  $('#startButton').on('click', function () {
    questionHandler.getQuestions().done(function (resp) {
      if (resp) {
        resp.results.forEach(q => questionHandler.addQuestion(q))
        game.init().render()
      }
    })
    timer.restart()
    $(this).hide()
  })
})

var questionHandler = {
  url: 'https://opentdb.com/api.php',
  query: `?amount=10&difficulty=${randomizedArray(['easy', 'medium'])[0]}&type=multiple&category=9`,
  questions: [],
  unansweredQuestions: [],
  resetMethods: ['incorrect', 'unanswered', 'all'], // incorrect, unanswered(timed out), all

  getQuestions: function asyncGetQuestions () {
    return $.ajax({
      url: this.url + this.query,
      method: 'GET'
    })
  },

  reset: function resetQuestionsByMethod (method) {
    switch (method.toLowerCase()) {
      case 'all':
        this.resetAll()
        break
      case 'incorrect':
        this.resetIncorrect()
        break
      case 'unanswered':
        this.resetUnanswered()
        break
    }
  },

  resetAll: function resetAllQuestions () {
    this.questions.forEach(q => q.reset())
  },

  resetIncorrect: function resetIncorrectQuestions () {
    this.questions.forEach(q => {
      if (q.isAnswered() && !q.answerStatus) {
        q.reset()
      }
    })
  },

  resetUnanswered: function resetUnansweredQuestions () {
    this.questions.forEach(q => {
      if (q.selectedAnswer === -1) {
        q.reset()
      }
    })
  },

  addQuestion: function addQuestion (obj) {
    var question = new Question(obj).compileOptions()
    var propNames = ['question', 'correctAnswer', 'incorrectAnswers']
    if (!this.questions.some(f => {
      return objectsHaveSameProperties(f, question, propNames)
    })) { this.questions.push(question) }
    return this
  },

  getUnanswered: function getUnansweredQuestions () {
    var res = []
    this.questions.forEach(q => {
      if (!q.isAnswered()) { res.push(q) }
    })
    console.log(res)
    this.unansweredQuestions = res
    return this
  },

  selectUnansweredMin: function (min) {
    this.resetMethods.every(i => {
      this.reset(i)
      return this.getUnanswered().unansweredQuestions.length < min
    })
    return this.unansweredQuestions.slice(0, min)
  }
}

var question = {
  question: 'What is your name?',
  timeoutSeconds: 20,
  correctAnswer: 'Kevin',
  incorrectAnswers: ['Robert', 'Lawrence', 'Bonnie'],
  answerOptions: [],
  randomizedOptions: [],
  selectedAnswer: false,
  answerStatus: false,

  compileOptions: function () {
    this.answerOptions = this.incorrectAnswers.slice()
    this.answerOptions.unshift(this.correctAnswer)
    this.randomizedOptions = this.randomOpts()
    return this
  },

  randomOpts: function randomizeQuestionOptions () {
    return randomizedArray(Array.from(this.answerOptions.entries()))
  },

  isAnswered: function questionHasBeenAnswered () {
    return typeof this.selectedAnswer === 'number'
  },

  selectAnswer: function (index) {
    if (!this.isAnswered()) {
      this.selectedAnswer = index
      console.log('selectedAnswer', this.answerOptions[this.selectedAnswer])
    }
    return this
  },

  checkAnswer: function () {
    if (this.isAnswered()) {
      this.answerStatus = this.selectedAnswer === 0
      console.log('answerStatus: ', this.answerStatus)
    }
    return this
  },

  timeout: function questionTimeout () {
    if (!this.isAnswered()) {
      --this.timeoutSeconds
      if (!this.timeoutSeconds) {
        this.selectAnswer(-1)
      }
    }
    return this.timeoutSeconds === 0
  },

  render: function renderQuestionData () {
    var rArr = this.randomizedOptions
    $('#questionOptions')
      .children()
      .each(function (i) {
        $(this).data('index', rArr[i][0]).html(rArr[i][1])
      })
    $('#question').html(this.question)
    $('#timer').text(this.timeoutSeconds)
  },

  reset: function resetQuestionAnswerData () {
    [this.selectedAnswer, this.answerStatus] = [false, false]
    console.log('reset', this.question)
    this.timeoutSeconds = question.timeoutSeconds
    return this
  }
}
function Question (questionText, correctAnswer, incorrectAnswers) {
  this.correctAnswer = correctAnswer || question.correctAnswer
  this.incorrectAnswers = incorrectAnswers || question.incorrectAnswers
  if (typeof questionText === 'object') {
    this.question = questionText.question
    this.correctAnswer = questionText.correctAnswer || questionText.correct_answer
    this.incorrectAnswers = questionText.incorrectAnswers || questionText.incorrect_answers
  } else { this.question = questionText || question.question }
  Object.setPrototypeOf(this, question)
  return this
}

var timer = {
  timer: 0,
  interval: 1000,
  isRunning: false,
  callback: function () { game.tick() },
  setCallback: function (callback) {
    this.callback = callback
    return this
  },
  restart: function restartTimer () {
    return this.stop().start()
  },
  start: function startTimer () {
    if (!this.isRunning) {
      this.timer = setInterval(this.callback, this.interval)
      this.isRunning = true
    }
    return this
  },
  stop: function stopTimer () {
    clearInterval(this.timer)
    this.isRunning = false
    return this
  }
}

var game = {
  questions: [new Question()],
  unansweredQuestions: [],
  correctAnswers: 0,
  incorrectAnswers: 0,
  gameOver: true,
  questionOptionElements: $('#questionOptions').children(),
  alertElements: $('.alert'),

  init: function initializeGame () {
    this.gameOver = false
    this.questions = questionHandler.selectUnansweredMin(10)
    this.unansweredQuestions = randomizedArray(this.questions).slice()
    this.nextQuestion()
    return this
  },

  tick: function gameTick () {
    if (this.question.timeout() || this.question.isAnswered()) {
      this.question.checkAnswer()
      if (this.question.answerStatus === true) {
        this.correctAnswers++
      } else { this.incorrectAnswers++ }
      this.delayNextQuestion()
    }
    if (this.gameOver) { timer.stop() }
    this.render()
  },

  nextQuestion: function getNextGameQuestion () {
    if (this.question && !this.question.isAnswered()) {
      this.unansweredQuestions.unshift(this.question)
      this.question = false
    }

    if (this.unansweredQuestions.length && !this.gameOver) {
      this.question = this.unansweredQuestions.pop()
      getGIF(this.question.correctAnswer).hide()
    } else {
      this.gameOver = true
      timer.stop()
      this.render()
      return this
    }

    if (this.question) {
      if (!this.question.answerOptions.length) {
        this.question.compileOptions()
      }
      if (!timer.isRunning) { timer.start() }
      this.render()
    }
    return this
  },

  delayNextQuestion: function delayedGetNextGameQuestion () {
    timer.stop()
    setTimeout(this.nextQuestion.bind(this), 5000)
    return this
  },

  decorateAnswer: function decorateAnswer () {
    if (!this.gameOver) {
      if (this.question && this.question.isAnswered()) {
        if (this.question.answerStatus === false) {
          this.alertElements
            .filter('#incorrectAnswerAlert')
            .show()
            .children('.answerStatus')
            .text(this.question.selectedAnswer === -1
              ? "Time's up!" : 'Incorrect!')
        } else { this.alertElements.filter('#correctAnswerAlert').show() }
        $('.correct-answer').html(this.question.correctAnswer)

        $('#questionOptions').children().each(function () {
          var id = $(this).removeClass('list-group-item-action').data('index')
          if (id === 0) { $(this).addClass('list-group-item-success') } else
          if (id === game.question.selectedAnswer) {
            $(this).addClass('list-group-item-danger')
          }
        })
        $('#skipButton').hide()
        $('#questionImage').show()
      } else {
        $('#questionImage').hide()
        $('#skipButton').show()
        this.questionOptionElements.each(function () {
          this.className = 'list-group-item list-group-item-action mb-2'
        })
        this.alertElements.each(function () { $(this).hide() })
      }
      $('#timer').parent().show()
      $('#answerStats').show()
      $('#correctAnswers').text(this.correctAnswers)
      $('#incorrectAnswers').text(this.incorrectAnswers)
    } else {
      $('#startButton').show()
      $('#timer').parent().hide()
      if (this.question) { // game is over
        setTimeout(() => getGIF('Game Over'), 3000)
        $('#question').append('<br><br> Game Over!')
      } else { // game has not started
        getGIF('Welcome')
      }
    }
  },

  render: function renderGame () {
    if (this.question) {
      this.question.render()
    }
    this.decorateAnswer()
    return this
  }
}

function randomizedArray (arr) {
  var rIndex
  var arrCopy = arr.slice()
  var tmpArr = []
  for (var i = 0; i < arr.length; i++) {
    rIndex = Math.floor(Math.random() * arrCopy.length)
    tmpArr.push(arrCopy.splice(rIndex, 1)[0])
  }
  // console.log(tmpArr)
  return tmpArr
}

function objectsHaveSameProperties (obj1, obj2, propNames) {
  var l = propNames
  if (!l.length) {
    l = Object.getOwnPropertyNames(obj1)
    var r = Object.getOwnPropertyNames(obj2)
    if (l.length !== r.length) { return false }
  }
  return l.every(p => { return obj1[p] === obj2[p] })
}

function getGIF (word, targetImg) {
  targetImg = targetImg || $('#questionImage')
  var offset = Math.floor(Math.random() * 5)
  var query = encodeURI(`?api_key=z3v6r9kDtDmjiyrhzJjciMd7WosSpw3B&q=${word}&limit=1&offset=${offset}&rating=G&lang=en`)
  $.ajax({
    url: `https://api.giphy.com/v1/gifs/search${query}`,
    method: 'GET'
  }).done(r => {
    let img = r.data[0].images.downsized
    targetImg
      .attr('src', img.url)
      .attr('width', img.width)
      .attr('height', img.height)
  })
  return targetImg
}

function * indexGen (length) {
  let i = 0
  while (i < length) {
    yield i++
  }
}
