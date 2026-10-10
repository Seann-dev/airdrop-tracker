import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes
from sqlalchemy import select
from datetime import datetime, timezone
from app.config import settings
from app.db.base import AsyncSessionLocal
from app.db.models import User, Project, Task

logger = logging.getLogger(__name__)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    app_url = settings.TELEGRAM_MINI_APP_URL
    
    keyboard = [
        [InlineKeyboardButton("Launch Airdrop Tracker", web_app=WebAppInfo(url=app_url))],
        [
            InlineKeyboardButton("Pending Tasks", callback_data="pending"),
            InlineKeyboardButton("Tracked Projects", callback_data="projects")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"👋 Welcome to *Airdrop Tracker AI*, {user.first_name}!\n\n"
        "Your automated Web3 airdrop scanner, task tracker, and campaign monitor.\n\n"
        "Click the button below to launch the Mini App, or use commands like /today and /deadlines.",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )

async def app_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    app_url = settings.TELEGRAM_MINI_APP_URL
    keyboard = [[InlineKeyboardButton("Open Mini App 🚀", web_app=WebAppInfo(url=app_url))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Launch your tracker dashboard:", reply_markup=reply_markup)

async def projects_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = str(update.effective_user.id)
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.telegram_id == tg_id))
        user = user_res.scalar_one_or_none()
        if not user:
            await update.message.reply_text("You haven't linked your tracker account yet. Open the Mini App to start!")
            return
            
        projs_res = await session.execute(select(Project).where(Project.user_id == user.id))
        projects = projs_res.scalars().all()
        
        if not projects:
            await update.message.reply_text("You have 0 tracked projects. Paste a campaign URL in the Mini App to start!")
            return
            
        lines = [f"📊 *Tracked Projects ({len(projects)})*:\n"]
        for p in projects[:15]:
            lines.append(f"• *{p.name}* [{p.status}] ({p.platform or 'Web3'})")
            
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def pending_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = str(update.effective_user.id)
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.telegram_id == tg_id))
        user = user_res.scalar_one_or_none()
        if not user:
            await update.message.reply_text("Please open the Mini App to initialize your account first.")
            return
            
        tasks_res = await session.execute(
            select(Task).where(Task.user_id == user.id, Task.is_completed == False)
        )
        tasks = tasks_res.scalars().all()
        
        if not tasks:
            await update.message.reply_text("🎉 All caught up! No pending tasks.")
            return
            
        lines = [f"⏳ *Pending Tasks ({len(tasks)})*:\n"]
        for t in tasks[:10]:
            lines.append(f"• *{t.title}* ({t.category or 'Task'})")
            
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def today_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Today's tasks (due today or daily check-in)
    tg_id = str(update.effective_user.id)
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.telegram_id == tg_id))
        user = user_res.scalar_one_or_none()
        if not user:
            await update.message.reply_text("Please open the Mini App to initialize your account first.")
            return

        tasks_res = await session.execute(
            select(Task).where(
                Task.user_id == user.id,
                Task.is_completed == False,
                Task.recurrence == "Daily"
            )
        )
        tasks = tasks_res.scalars().all()
        
        if not tasks:
            await update.message.reply_text("✨ No specific daily tasks due today! Check /pending for all tasks.")
            return
            
        lines = ["📅 *Today's Tasks & Check-ins*:\n"]
        for t in tasks:
            lines.append(f"• *{t.title}* [Daily Check-in]")
            
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def deadlines_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tg_id = str(update.effective_user.id)
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.telegram_id == tg_id))
        user = user_res.scalar_one_or_none()
        if not user:
            await update.message.reply_text("Please open the Mini App to initialize your account first.")
            return

        projs_res = await session.execute(
            select(Project).where(Project.user_id == user.id, Project.deadline != None)
        )
        projs = projs_res.scalars().all()
        
        if not projs:
            await update.message.reply_text("📅 No upcoming project deadlines set.")
            return
            
        lines = ["⏰ *Upcoming Deadlines*:\n"]
        for p in projs:
            d_str = p.deadline.strftime("%Y-%m-%d %H:%M UTC") if p.deadline else "Unknown"
            lines.append(f"• *{p.name}*: {d_str}")
            
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = (
        "🤖 *Airdrop Tracker AI Bot Commands*:\n\n"
        "/start - Welcome & launch Mini App\n"
        "/app - Open the Telegram Mini App\n"
        "/today - View tasks due today or daily check-ins\n"
        "/pending - List all your pending airdrop tasks\n"
        "/deadlines - View upcoming campaign deadlines\n"
        "/projects - View your tracked airdrop projects\n"
        "/help - Display this help message"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")

def setup_bot_app() -> Application | None:
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("Telegram Bot Token not configured. Running in web-only mode.")
        return None
        
    app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("app", app_command))
    app.add_handler(CommandHandler("projects", projects_command))
    app.add_handler(CommandHandler("pending", pending_command))
    app.add_handler(CommandHandler("today", today_command))
    app.add_handler(CommandHandler("deadlines", deadlines_command))
    app.add_handler(CommandHandler("help", help_command))
    return app
