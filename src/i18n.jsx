import { createContext, useContext } from 'react'

const messages = {
  fr: {
    dashboard: 'Tableau de bord', workspace: 'Mon espace', barbers: 'Barbiers', summary: 'Résumé', settings: 'Paramètres', logout: 'Se déconnecter',
    access: 'GESTION DE SALON', welcome: 'Bienvenue dans votre espace', chooseAccess: 'Choisissez votre type d’accès pour continuer.', admin: 'Administrateur', barber: 'Barbier', adminDescription: 'Gérez le salon, l’équipe et les revenus', barberDescription: 'Enregistrez vos prestations et consultez vos gains', accessButton: 'Accéder ←', install: 'Installez HFafa depuis le menu de votre navigateur pour y accéder comme une application.',
    adminLogin: 'Connexion administrateur', welcomeBack: 'Content de vous revoir', loginDescription: 'Connectez-vous pour gérer votre salon.', phone: 'Numéro de téléphone', password: 'Mot de passe', login: 'Se connecter', createAccount: 'Créer un compte administrateur', invalidAdmin: 'Numéro ou mot de passe incorrect.',
    barberLogin: 'Espace barbier', hello: 'Bonjour !', barberLoginDescription: 'Saisissez les identifiants fournis par votre responsable.', barberCode: 'Code barbier', enterWorkspace: 'Entrer dans mon espace', invalidBarber: 'Téléphone ou code barbier incorrect.',
    createTitle: 'Créer un compte', salonStart: 'Votre salon commence ici', firstName: 'Prénom', lastName: 'Nom', salonName: 'Nom du salon', address: 'Adresse', passwordHint: 'Mot de passe (6 caractères min.)', createMyAccount: 'Créer mon compte', back: 'Retour',
  },
  ar: {
    dashboard: 'لوحة التحكم', workspace: 'مساحتي', barbers: 'الحلاقون', summary: 'الملخص', settings: 'الإعدادات', logout: 'تسجيل الخروج',
    access: 'إدارة الصالون', welcome: 'مرحباً بك في مساحتك', chooseAccess: 'اختر نوع الدخول للمتابعة.', admin: 'المدير', barber: 'الحلاق', adminDescription: 'أدر الصالون والفريق والإيرادات', barberDescription: 'سجّل خدماتك وتابع أرباحك', accessButton: 'دخول ←', install: 'ثبّت HFafa من قائمة المتصفح للوصول إليه كتطبيق.',
    adminLogin: 'دخول المدير', welcomeBack: 'سعداء بعودتك', loginDescription: 'سجّل الدخول لإدارة صالونك.', phone: 'رقم الهاتف', password: 'كلمة المرور', login: 'تسجيل الدخول', createAccount: 'إنشاء حساب مدير', invalidAdmin: 'رقم الهاتف أو كلمة المرور غير صحيح.',
    barberLogin: 'مساحة الحلاق', hello: 'مرحباً!', barberLoginDescription: 'أدخل البيانات التي زودك بها مسؤول الصالون.', barberCode: 'رمز الحلاق', enterWorkspace: 'الدخول إلى مساحتي', invalidBarber: 'رقم الهاتف أو رمز الحلاق غير صحيح.',
    createTitle: 'إنشاء حساب', salonStart: 'صالونك يبدأ من هنا', firstName: 'الاسم', lastName: 'اللقب', salonName: 'اسم الصالون', address: 'العنوان', passwordHint: 'كلمة المرور (6 أحرف على الأقل)', createMyAccount: 'إنشاء حسابي', back: 'رجوع',
  },
}

export const I18nContext = createContext({ locale: 'fr', t: (key) => key })
export const useI18n = () => useContext(I18nContext)
export const getMessages = (locale) => messages[locale] || messages.fr
