FROM python:3-alpine

WORKDIR /usr/src/app
COPY . /usr/src/app

EXPOSE 8080

VOLUME /usr/src/db

RUN pip install --no-cache .

CMD ["gunicorn", "-b", "0.0.0.0:8080", "go.api.main:init('/usr/src/db/go.json')"]
