/* eslint-env jquery */

$.when($.ready).then(function () {
  question.compileOptions()
  console.log(question)
  timer.start()

  var gameQuestionOptions = $('#questionOptions').children()
  $.each(gameQuestionOptions, function (index) {
    console.log(this, index)
    $(this).on('click', function () { 
      question.selectAnswer(index).checkAnswer()
    })
  })
})

var question = {
  question: 'What is your name?',
  timeoutSeconds: 30,
  correctAnswer: 'Kevin',
  incorrectAnswers: ['Robert', 'Lawrence', 'Bonnie'],
  answerOptions: [],
  selectedAnswer: false,
  answerStatus: false,

  compileOptions: function () {
    this.answerOptions = this.incorrectAnswers.slice().shift(this.correctAnswer)
    return this
  },

  isAnswered: function questionHasBeenAnswered () {
    return typeof this.selectedAnswer === 'number'
  },

  selectAnswer: function (index) {
    if (!this.isAnswered()) {
      this.selectedAnswer = index
      console.log('selectedAnswer', this.selectedAnswer)
    }
    return this
  },

  checkAnswer: function () {
    if (this.isAnswered()) {
      this.answerStatus = this.selectedAnswer === 0
      console.log('answerStatus', this.answerStatus)
    }
    return this
  },

  timeout: function questionTimeout () {
    if (!this.isAnswered()) {
      if (this.timeoutSeconds) {
        --this.timeoutSeconds
        console.log(this.timeoutSeconds)
      } else this.selectAnswer(-1).checkAnswer()
    }
  }
}

var timer = {
  timer: 0,
  interval: 1000,
  context: this,
  callback: function () { question.timeout() },
  start: function startTimer () {
    this.timer = setInterval(this.callback.bind(this.context), this.interval)
  },
  stop: function stopTimer () {
    clearInterval(this.timer)
  }
}
