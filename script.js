const apiBaseUrl = 'http://localhost/quizz/api/index.php';

let currentQuestionIndex = 0;
let userId = 1;
let questions = [];
let currentQuestion = null;
let hasAnswered = false;
let answeredQuestions = new Set();
let userStats = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    await loadAndDisplayStats();
    showQuestion();
    updateProgress();
});

function updatePointsCircle(currentPoints, maxPoints) {
    const circle = document.getElementById('progress-circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    const offset = circumference - (currentPoints / maxPoints) * circumference;
    circle.style.strokeDashoffset = offset;
    
    document.getElementById('current-points').textContent = currentPoints;
}

async function loadAndDisplayStats() {
    try {
        const [statsResponse, ticketsResponse] = await Promise.all([
            axios.get(`${apiBaseUrl}?endpoint=user_stats&user_id=${userId}`),
            axios.get(`${apiBaseUrl}?endpoint=get_all_tickets`)
        ]);

        const { user } = statsResponse.data;
        const tickets = ticketsResponse.data;
        userStats = user;
        console.log(userStats);
        console.log(tickets);

        document.getElementById('current-points').textContent = user.user_points;
        document.getElementById('quizzes-played').textContent = user.total_quizzes_played;
        document.getElementById('correct-answers').textContent = user.total_correct_answers;

        updatePointsCircle(user.user_points, Math.max(...tickets.map(t => t.points_required)));

        const ticketsContainer = document.getElementById('tickets-container');
        ticketsContainer.innerHTML = tickets.map(ticket => {
            const progress = (user.user_points / ticket.points_required) * 100;
            const isUnlockable = user.user_points >= ticket.points_required;
            
            // Calculer la classe de progression en fonction du pourcentage
            let progressClass = 'bg-gray-200';
            if (progress >= 100) {
                progressClass = 'bg-ayoba-blue animate__animated animate__pulse animate__infinite';
            } else if (progress >= 75) {
                progressClass = 'bg-ayoba-yellow';
            } else if (progress >= 50) {
                progressClass = 'bg-yellow-400';
            } else if (progress >= 25) {
                progressClass = 'bg-yellow-300';
            }

            // Calculer le message de progression
            const pointsNeeded = ticket.points_required - user.user_points;
            const progressMessage = isUnlockable 
                ? `<span class="text-ayoba-blue font-bold">Débloqué !</span>`
                : `<span class="text-gray-600">Encore ${pointsNeeded} points</span>`;

            return `
                <div class="ticket-card p-4 rounded-lg border border-gray-200 mb-4">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="font-semibold text-ayoba-black text-lg">${ticket.name}</h3>
                            <p class="text-sm text-gray-600">${ticket.reward}</p>
                        </div>
                        <div class="text-right">
                            <span class="inline-block px-3 py-1 rounded-full text-sm ${ticket.quantity <= 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}">
                                ${ticket.quantity} restant${ticket.quantity > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <div class="relative pt-1">
                        <div class="flex mb-2 items-center justify-between">
                            <div>
                                <span class="text-xs font-semibold inline-block text-ayoba-blue">
                                    ${Math.min(Math.round(progress), 100)}%
                                </span>
                            </div>
                            <div class="text-right">
                                <span class="text-xs font-semibold inline-block">
                                    ${progressMessage}
                                </span>
                            </div>
                        </div>
                        <div class="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
                            <div style="width:${Math.min(progress, 100)}%" 
                                 class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${progressClass} transition-all duration-500">
                            </div>
                        </div>
                    </div>

                    ${isUnlockable ? `
                        <button class="mt-3 w-full ayoba-button text-white px-4 py-2 rounded-lg text-sm animate__animated animate__pulse animate__infinite">
                            Échanger maintenant !
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Impossible de charger les statistiques');
    }
}

async function loadQuestions() {
    try {
        const response = await axios.get(`${apiBaseUrl}?endpoint=questions`);
        questions = response.data;
    } catch (error) {
        console.error('Error loading questions:', error);
        showError('Impossible de charger les questions. Veuillez réessayer.');
    }
}

async function loadAnswers(questionId) {
    try {
        const response = await axios.get(`${apiBaseUrl}?endpoint=answers&question_id=${questionId}`);
        return response.data;
    } catch (error) {
        console.error('Error loading answers:', error);
        showError('Impossible de charger les réponses. Veuillez réessayer.');
        return [];
    }
}

function updateProgress() {
    const progress = Math.round((currentQuestionIndex / questions.length) * 100);
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

async function showQuestion() {
    if (currentQuestionIndex < questions.length) {
        hasAnswered = false;
        currentQuestion = questions[currentQuestionIndex];
        
        if (answeredQuestions.has(currentQuestion.question_id)) {
            currentQuestionIndex++;
            showQuestion();
            return;
        }
        
        const questionContainer = document.getElementById('question-container');
        questionContainer.className = 'mb-6 text-xl font-semibold text-ayoba-black animate__animated animate__fadeIn';
        questionContainer.innerText = currentQuestion.question_text;
        
        const answers = await loadAnswers(currentQuestion.question_id);
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = '';
        
        answers.forEach((answer, index) => {
            const answerButton = document.createElement('button');
            answerButton.className = 'answer-button block w-full text-left bg-white border-2 border-gray-200 hover:border-ayoba-blue p-4 my-3 rounded-xl transition-all duration-300 animate__animated animate__fadeIn';
            answerButton.style.animationDelay = `${index * 100}ms`;
            answerButton.innerHTML = `
                <div class="flex items-center">
                    <div class="w-6 h-6 border-2 border-gray-300 rounded-full mr-3 flex items-center justify-center">
                        <div class="answer-dot w-3 h-3 rounded-full hidden bg-ayoba-blue"></div>
                    </div>
                    <span>${answer.answer_text}</span>
                </div>
            `;
            answerButton.onclick = () => !hasAnswered && handleAnswer(answer.answer_id, answer.is_correct, answerButton);
            answersContainer.appendChild(answerButton);
        });
        
        const nextButton = document.getElementById('next-question-btn');
        nextButton.disabled = true;
        nextButton.className = 'ayoba-button w-full text-white font-bold px-6 py-3 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ayoba-blue focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed';
        nextButton.innerText = currentQuestionIndex === questions.length - 1 ? 'Terminer' : 'Suivant';
        updateProgress();
    } else {
        showQuizComplete();
    }
}

async function handleAnswer(answerId, isCorrect, buttonElement) {
    if (hasAnswered) return;
    hasAnswered = true;
    
    answeredQuestions.add(currentQuestion.question_id);
    
    try {
        const response = await axios.post(`${apiBaseUrl}?endpoint=submit_answer`, {
            user_id: userId,
            question_id: currentQuestion.question_id,
            answer_id: answerId
        });
        
        const result = response.data;
        
        // Désactiver tous les boutons et masquer les points
        document.querySelectorAll('.answer-button').forEach(button => {
            button.classList.add('opacity-50');
            button.classList.remove('hover:border-ayoba-blue');
            button.disabled = true;
        });
        
        // Afficher le résultat
        if (result.is_correct) {
            // Bonne réponse
            buttonElement.className = 'answer-button block w-full text-left bg-blue-50 border-2 border-ayoba-blue p-4 my-3 rounded-xl animate__animated animate__pulse';
            buttonElement.querySelector('.answer-dot').classList.remove('hidden');
            showFeedback(`
                <div class="flex items-center justify-center">
                    <svg class="w-6 h-6 text-ayoba-blue mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Bravo ! +${result.points_awarded} points</span>
                </div>
            `, 'success');
            
            // Animation des points gagnés
            const pointsAnimation = document.createElement('div');
            pointsAnimation.className = 'fixed text-2xl font-bold text-ayoba-blue animate__animated animate__fadeOutUp';
            pointsAnimation.style.left = `${buttonElement.offsetLeft + buttonElement.offsetWidth / 2}px`;
            pointsAnimation.style.top = `${buttonElement.offsetTop}px`;
            pointsAnimation.textContent = `+${result.points_awarded}`;
            document.body.appendChild(pointsAnimation);
            setTimeout(() => pointsAnimation.remove(), 1000);

            await loadAndDisplayStats();
        } else {
            // Mauvaise réponse
            buttonElement.className = 'answer-button block w-full text-left bg-red-50 border-2 border-red-500 p-4 my-3 rounded-xl animate__animated animate__shakeX';
            showFeedback(`
                <div class="flex items-center justify-center">
                    <svg class="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Incorrect. -1 point</span>
                </div>
            `, 'error');
            await loadAndDisplayStats();
        }
        
        // Activer le bouton suivant avec animation
        const nextButton = document.getElementById('next-question-btn');
        nextButton.disabled = false;
        nextButton.classList.add('animate__animated', 'animate__pulse');
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        showError('Erreur lors de la soumission de la réponse.');
    }
}

function showFeedback(message, type) {
    const feedbackElement = document.createElement('div');
    feedbackElement.className = `mt-4 p-4 rounded-lg text-center animate__animated animate__fadeIn ${
        type === 'success' ? 'bg-blue-50 text-ayoba-blue' : 'bg-red-50 text-red-800'
    }`;
    feedbackElement.innerHTML = message;
    
    const oldFeedback = document.querySelector('.feedback');
    if (oldFeedback) oldFeedback.remove();
    
    feedbackElement.classList.add('feedback');
    document.getElementById('answers-container').appendChild(feedbackElement);
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 rounded animate__animated animate__fadeIn';
    errorElement.textContent = message;
    document.getElementById('quiz-container').appendChild(errorElement);
    setTimeout(() => errorElement.remove(), 5000);
}

function showQuizComplete() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = `
        <div class="p-8 text-center animate__animated animate__fadeIn">
            <div class="ayoba-gradient text-white p-8 rounded-xl mb-6">
                <h2 class="text-3xl font-bold mb-4">Quiz Terminé !</h2>
                <p class="text-xl">Félicitations pour avoir terminé le quiz !</p>
            </div>
            <button onclick="location.reload()" 
                    class="ayoba-button text-white font-bold px-8 py-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">
                Recommencer le Quiz
            </button>
        </div>
    `;
}

document.getElementById('next-question-btn').addEventListener('click', () => {
    currentQuestionIndex++;
    showQuestion();
});
