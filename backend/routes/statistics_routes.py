from fastapi import APIRouter
from services.statistics_service import *

router = APIRouter(
    tags=["Statistics"]
)


@router.get("/statistics/overview")
def statistics_overview():

    return get_overview()


@router.get("/statistics/alerts-by-type")
def statistics_alerts_by_type():

    return get_alerts_by_type()


@router.get("/statistics/alerts-timeline")
def statistics_alerts_timeline(days: int = 30):

    return get_alerts_timeline(days)


@router.get("/statistics/driver-ranking")
def statistics_driver_ranking(limit: int = 10):

    return get_driver_ranking(limit)
