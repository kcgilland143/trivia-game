/* eslint-env jquery */

$.when($.ready).then(function () {
  game.questions = questionHandler.getQuestions().questions
  $('.alert, #answerStats, #skipButton').hide()
  $('#timer').parent().hide()
  $('#questionOptions').children().each(function () {
    $(this).on('click', function () {
      if (!game.question.isAnswered()) {
        var index = $(this).data('index')
        game.question.selectAnswer(index).checkAnswer()
        game.tick()
      }
    })
  })
  $('#skipButton').on('click', function () {
    game.nextQuestion().render()
  })
  $('#startButton').on('click', function () {
    questionHandler.getQuestions()
    game.init().render()
    timer.setCallback(game.tick.bind(game)).restart()
    $('#timer').parent().show()
    $(this).hide()
  })
})

var be = {}
be.questions = [{
  question: 'hoo',
  correctAnswer: 'me',
  incorrectAnswers: ['mi', 'mo', 'he']
},
{
  question: 'boo',
  correctAnswer: 'ya',
  incorrectAnswers: ['hi', 'ho', 'he']
}]

var questionHandler = {
  url: 'https://opentdb.com/api.php',
  query: '?amount=10&category=9&difficulty=easy&type=multiple',
  questions: [],

  getQuestions: function () {
    //  $.ajax
    $.ajax({
      url: this.url + this.query,
      method: 'GET',
    }).done(function (response) {
      for (var i = 0; i < response.results.length; i++) {
        questionHandler.questions.push(new Question(response.results[i]))
      }
    })
    return this
  },
}

var question = {
  question: 'What is your name?',
  timeoutSeconds: 10,
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
        this.selectAnswer(-1).checkAnswer()
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
    this.timeoutSeconds = 10
    return this
  }
}
function Question (questionText, correctAnswers, incorrectAnswers) {
  Object.setPrototypeOf(this, question)
  this.questionText = questionText || question.questionText
  this.correctAnswers = correctAnswers || question.correctAnswers
  this.incorrectAnswers = incorrectAnswers || question.incorrectAnswers
  if (typeof questionText === 'object') {
    this.question = questionText.question
    this.correctAnswer = questionText.correctAnswer || questionText.correct_answer
    this.incorrectAnswers = questionText.incorrectAnswers || questionText.incorrect_answers
  }
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
    this.timer = setInterval(this.callback, this.interval)
    this.isRunning = true
    return this
  },
  stop: function stopTimer () {
    clearInterval(this.timer)
    this.isRunning = false
    return this
  }
}

var game = {
  questions: [new Question(), new Question(be.questions[0]), new Question(be.questions[1])],
  unansweredQuestions: [],
  correctAnswers: 0,
  incorrectAnswers: 0,
  questionOptionElements: $('#questionOptions').children(),
  alertElements: $('.alert'),

  init: function initializeGame () {
    this.gameOver = false
    console.log(this.questions)
    this.unansweredQuestions = this.questions.slice(0, 10)
    for (var i = 0; i < this.questions.length; i++) {
      this.questions[i].reset()
    }
    this.nextQuestion()
    return this
  },

  tick: function gameTick () {
    if (this.question.timeout() || this.question.isAnswered()) {
      if (this.question.answerStatus === true) {
        this.correctAnswers++
      } else { this.incorrectAnswers++ }
      this.delayNextQuestion()
      timer.stop()
    }
    this.render()
  },

  nextQuestion: function getNextGameQuestion () {
    if (this.question && !this.question.isAnswered()) {
      this.unansweredQuestions.unshift(this.question)
      this.question = false
    }

    if (this.unansweredQuestions.length) {
      this.question = this.unansweredQuestions.pop()
    } else { this.gameOver = true; this.render(); return this }

    if (this.question) {
      if (!this.question.answerOptions.length) { this.question.compileOptions() } // .reset()
      if (!timer.isRunning) { timer.start() }
      // timer.setCallback(this.tick.bind(this)).restart()
      this.render()
    }
    return this
  },

  delayNextQuestion: function delayedGetNextGameQuestion () {
    setTimeout(this.nextQuestion.bind(this), 2000)
    return this
  },

  decorateAnswer: function decorateAnswer () {
    if (this.question && this.question.isAnswered()) {
      if (this.question.answerStatus === false) {
        this.alertElements
          .filter('#incorrectAnswerAlert')
          .show()
          .children('.answerStatus')
          .text(this.question.selectedAnswer === -1
            ? "Time's up!" : 'Incorrect!')
      } else { this.alertElements.filter('#correctAnswerAlert').show() }
      $('.correct-answer').text(this.question.correctAnswer)

      $('#questionOptions').children().each(function () {
        var id = $(this).removeClass('list-group-item-action').data('index')
        if (id === 0) { $(this).addClass('list-group-item-success') } else
        if (id === game.question.selectedAnswer) {
          $(this).addClass('list-group-item-danger')
        }
      })
      $('#skipButton').hide()
    } else {
      $('#skipButton').show()
      this.questionOptionElements.each(function () {
        this.className = 'list-group-item list-group-item-action mb-2'
      })
      this.alertElements.each(function () { $(this).hide() })
    }
    $('#answerStats').show()
    $('#correctAnswers').text(this.correctAnswers)
    $('#incorrectAnswers').text(this.incorrectAnswers)
  },

  render: function renderGame () {
    if (!this.gameOver) {
      this.question.render()
      // this.decorateAnswer()
    } else { console.log('Game Over'); $('#startButton').show() }
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
  console.log(tmpArr)
  return tmpArr
}
