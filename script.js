const apiBaseUrl = 'http://localhost/quizz/api/index.php';

let currentQuestionIndex = 0;
let userId = 1;
let questions = [];
let currentQuestion = null;
let hasAnswered = false;
let answeredQuestions = new Set();
let userStats = null;

// Configuration des récompenses
const REWARDS = [
    { points: 100, name: 'Badge Bronze', icon: '🥉' },
    { points: 250, name: 'Accès Premium', icon: '⭐' },
    { points: 500, name: 'Contenu Exclusif', icon: '👑' }
];

const MAX_POINTS = REWARDS[REWARDS.length - 1].points;

// Initialisation des éléments UI
function initializeUI() {
    // Initialiser les points
    document.getElementById('current-points').textContent = '0';
    document.getElementById('rewards-progress-bar').style.width = '0%';
    
    // Initialiser les tooltips
    const rewardsInfo = document.getElementById('rewards-info');
    const rewardsTooltip = document.getElementById('rewards-tooltip');
    
    if (rewardsInfo && rewardsTooltip) {
        rewardsInfo.addEventListener('mouseover', () => {
            rewardsTooltip.classList.remove('hidden');
        });
        
        rewardsInfo.addEventListener('mouseout', () => {
            rewardsTooltip.classList.add('hidden');
        });
    }

    // Initialiser le bouton suivant
    const nextButton = document.getElementById('next-question-btn');
    if (nextButton) {
        nextButton.disabled = true;
        nextButton.addEventListener('click', () => {
            currentQuestionIndex++;
            showQuestion();
        });
    }
}

async function loadAndDisplayStats() {
    try {
        const response = await axios.get(`${apiBaseUrl}?endpoint=user_stats&user_id=${userId}`);
        userStats = response.data;
        
        // Mettre à jour les statistiques affichées
        document.getElementById('current-points').textContent = userStats.user_points;
        document.getElementById('quizzes-played').textContent = userStats.total_quizzes;
        document.getElementById('correct-answers').textContent = userStats.total_correct_answers;
        
        // Mettre à jour la barre de progression des récompenses
        updateRewardsProgress(userStats.user_points);
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Impossible de charger les statistiques.');
    }
}

async function loadQuestions() {
    try {
        console.log('Chargement des questions...');
        const response = await axios.get(`${apiBaseUrl}?endpoint=questions`);
        console.log('Questions reçues:', response.data);
        questions = response.data;
    } catch (error) {
        console.error('Error loading questions:', error);
        showError('Impossible de charger les questions. Veuillez réessayer.');
    }
}

async function loadAnswers(questionId) {
    try {
        console.log('Chargement des réponses pour la question:', questionId);
        const response = await axios.get(`${apiBaseUrl}?endpoint=answers&question_id=${questionId}`);
        console.log('Réponses reçues:', response.data);
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
    console.log('Affichage de la question. Index actuel:', currentQuestionIndex);
    console.log('Nombre total de questions:', questions.length);
    
    if (currentQuestionIndex < questions.length) {
        hasAnswered = false;
        currentQuestion = questions[currentQuestionIndex];
        
        console.log('Question actuelle:', currentQuestion);
        
        if (answeredQuestions.has(currentQuestion.question_id)) {
            currentQuestionIndex++;
            showQuestion();
            return;
        }
        
        const questionContainer = document.getElementById('question-container');
        const answersContainer = document.getElementById('answers-container');
        
        if (!questionContainer || !answersContainer) {
            console.error('Conteneurs non trouvés:', {
                questionContainer: !!questionContainer,
                answersContainer: !!answersContainer
            });
            return;
        }
        
        questionContainer.className = 'mb-6 text-xl font-semibold text-ayoba-black animate__animated animate__fadeIn';
        questionContainer.innerText = currentQuestion.question_text;
        
        const answers = await loadAnswers(currentQuestion.question_id);
        answersContainer.innerHTML = '';
        answersContainer.className = 'mb-6';
        
        answers.forEach((answer, index) => {
            const answerButton = document.createElement('button');
            answerButton.className = 'answer-button block w-full text-left bg-white border-2 border-gray-200 hover:border-ayoba-blue p-4 my-3 rounded-xl transition-all duration-300 animate__animated animate__fadeIn';
            answerButton.style.animationDelay = `${index * 0.1}s`;
            answerButton.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-grow">${answer.answer_text}</div>
                    <div class="answer-dot hidden">
                        <svg class="w-6 h-6 text-ayoba-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                </div>
            `;
            
            answerButton.addEventListener('click', () => handleAnswer(answer.answer_id, answer.is_correct, answerButton));
            answersContainer.appendChild(answerButton);
        });
        
        // Mettre à jour la progression
        document.getElementById('current-question').textContent = currentQuestionIndex + 1;
        document.getElementById('total-questions').textContent = questions.length;
        updateProgress();
        
        // Désactiver le bouton suivant jusqu'à ce qu'une réponse soit donnée
        const nextButton = document.getElementById('next-question-btn');
        if (nextButton) {
            nextButton.disabled = true;
        }
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
        
        document.querySelectorAll('.answer-button').forEach(button => {
            button.classList.add('opacity-50');
            button.classList.remove('hover:border-ayoba-blue');
            button.disabled = true;
        });
        
        if (result.is_correct) {
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
            
            const pointsAnimation = document.createElement('div');
            pointsAnimation.className = 'fixed text-2xl font-bold text-ayoba-blue animate__animated animate__fadeOutUp';
            pointsAnimation.style.left = `${buttonElement.offsetLeft + buttonElement.offsetWidth / 2}px`;
            pointsAnimation.style.top = `${buttonElement.offsetTop}px`;
            pointsAnimation.textContent = `+${result.points_awarded}`;
            document.body.appendChild(pointsAnimation);
            setTimeout(() => pointsAnimation.remove(), 1000);
            
            await loadAndDisplayStats();
            updateRewardsProgress(result.total_points);
        } else {
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
        
        const nextButton = document.getElementById('next-question-btn');
        if (nextButton) {
            nextButton.disabled = false;
            nextButton.classList.add('animate__animated', 'animate__pulse');
        }
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        showError('Erreur lors de la soumission de la réponse.');
    }
}

function showFeedback(message, type = 'info') {
    const feedbackContainer = document.createElement('div');
    feedbackContainer.className = `fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg shadow-lg animate__animated animate__fadeInDown ${
        type === 'success' ? 'bg-green-100 text-green-800' :
        type === 'error' ? 'bg-red-100 text-red-800' :
        'bg-blue-100 text-blue-800'
    }`;
    feedbackContainer.innerHTML = message;
    document.body.appendChild(feedbackContainer);
    setTimeout(() => {
        feedbackContainer.classList.replace('animate__fadeInDown', 'animate__fadeOutUp');
        setTimeout(() => feedbackContainer.remove(), 500);
    }, 2000);
}

function showError(message) {
    showFeedback(message, 'error');
}

function showQuizComplete() {
    const container = document.querySelector('.lg\\:col-span-1:nth-child(2) > div');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-2xl font-bold text-ayoba-blue mb-4">Quiz terminé !</h2>
                <p class="text-gray-600 mb-6">Félicitations ! Vous avez répondu à toutes les questions.</p>
                <button onclick="location.reload()" class="ayoba-button text-white px-6 py-3 rounded-lg">
                    Recommencer
                </button>
            </div>
        `;
    }
}

function updateRewardsProgress(currentPoints) {
    const progressBar = document.getElementById('rewards-progress-bar');
    const progressPercentage = Math.min((currentPoints / MAX_POINTS) * 100, 100);
    
    // Animation fluide de la barre de progression
    progressBar.style.width = `${progressPercentage}%`;
    
    // Mise à jour des marqueurs de récompenses
    REWARDS.forEach((reward, index) => {
        const marker = document.querySelector(`#reward-markers > div:nth-child(${index + 1})`);
        const icon = marker.querySelector('div:first-child');
        
        if (currentPoints >= reward.points) {
            // Récompense débloquée
            icon.classList.add('bg-ayoba-yellow', 'scale-110');
            icon.classList.remove('bg-white');
            
            // Ajouter une animation de pulse
            if (!icon.classList.contains('animate__animated')) {
                icon.classList.add('animate__animated', 'animate__pulse');
            }
            
            // Animation spéciale si c'est une nouvelle récompense
            if (currentPoints === reward.points) {
                showRewardUnlocked(reward);
            }
        } else {
            // Récompense non débloquée
            icon.classList.remove('bg-ayoba-yellow', 'scale-110', 'animate__animated', 'animate__pulse');
            icon.classList.add('bg-white');
        }
        
        // Ajouter une classe pour les récompenses presque débloquées
        const closeToUnlock = currentPoints >= (reward.points * 0.8);
        if (closeToUnlock && !icon.classList.contains('bg-ayoba-yellow')) {
            icon.classList.add('animate__animated', 'animate__headShake');
            setTimeout(() => {
                icon.classList.remove('animate__animated', 'animate__headShake');
            }, 1000);
        }
    });
}

function showRewardUnlocked(reward) {
    const rewardModal = document.createElement('div');
    rewardModal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 animate__animated animate__fadeIn';
    rewardModal.innerHTML = `
        <div class="bg-white rounded-xl p-8 text-center max-w-md mx-auto animate__animated animate__zoomIn">
            <div class="text-6xl mb-4 animate__animated animate__bounceIn">${reward.icon}</div>
            <div class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-200"></div>
                </div>
                <div class="relative flex justify-center">
                    <span class="bg-white px-4 text-sm text-gray-500">NOUVELLE RÉCOMPENSE</span>
                </div>
            </div>
            <h2 class="text-2xl font-bold text-ayoba-blue mt-4 mb-2">${reward.name}</h2>
            <div class="text-ayoba-yellow text-4xl font-bold mb-4">${reward.points} points</div>
            <p class="text-gray-600 mb-6">Félicitations ! Continuez comme ça pour débloquer plus de récompenses.</p>
            <button class="ayoba-button text-white px-8 py-3 rounded-lg transform transition-transform hover:scale-105">
                Continuer
            </button>
        </div>
    `;
    document.body.appendChild(rewardModal);
    
    // Ajouter des confettis
    const confetti = document.createElement('div');
    confetti.className = 'fixed inset-0 pointer-events-none z-50';
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute w-2 h-2 rounded-full';
        particle.style.backgroundColor = ['#FFD700', '#4299E1', '#48BB78'][Math.floor(Math.random() * 3)];
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = '-10px';
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        particle.style.animation = `fall ${1 + Math.random() * 2}s linear forwards`;
        confetti.appendChild(particle);
    }
    document.body.appendChild(confetti);
    
    // Ajouter le style pour l'animation des confettis
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fall {
            to {
                transform: translateY(100vh) rotate(960deg);
            }
        }
    `;
    document.head.appendChild(style);
    
    rewardModal.querySelector('button').onclick = () => {
        rewardModal.classList.replace('animate__fadeIn', 'animate__fadeOut');
        confetti.remove();
        setTimeout(() => {
            rewardModal.remove();
            style.remove();
        }, 500);
    };
    
    // Retirer automatiquement après 5 secondes
    setTimeout(() => {
        if (document.body.contains(rewardModal)) {
            rewardModal.classList.replace('animate__fadeIn', 'animate__fadeOut');
            confetti.remove();
            setTimeout(() => {
                rewardModal.remove();
                style.remove();
            }, 500);
        }
    }, 5000);
}

// Chargement initial
document.addEventListener('DOMContentLoaded', async () => {
    try {
        initializeUI();
        await loadQuestions();
        await loadAndDisplayStats();
        showQuestion();
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Une erreur est survenue lors de l\'initialisation du quiz.');
    }
});
