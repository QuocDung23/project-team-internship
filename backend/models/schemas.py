from pydantic import BaseModel


class DriverCreate(BaseModel):

    full_name:str
    license_number:str
    status:str="active"


class AlertCreate(BaseModel):

    trip_id:str
    alert_type:str
    method:str


class TripStart(BaseModel):

    driver_id:str


class SettingUpdate(BaseModel):

    ear_threshold:float
    mar_threshold:float
    frame_threshold:int