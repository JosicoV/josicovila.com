FROM php:8.2-apache

RUN a2enmod rewrite headers expires

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY app/ /var/www/html/

WORKDIR /var/www/html